import { Request, Response } from 'express';
import { Plan } from '../models/Plan.ts';
import { Programme } from '../models/Programme.ts';
import { Service } from '../models/Service.ts';
import { Webinar } from '../models/Webinar.ts';
import { Mentor } from '../models/Mentor.ts';
import { Testimonial } from '../models/Testimonial.ts';
import {
  CONFIRMED_SENTENCE,
  Offering,
  POLICY_ANSWER,
  groundFactors,
  inferRecommendation,
  isDiscoveryReply,
  isPolicyQuestion,
  isWebinarQuestion,
  LiveWebinar,
  webinarAnswer,
  matchOffering,
  neutralizeItem,
  offeringRelevant,
  neutralizeList,
  neutralizeText,
  normalizeName,
  validateReply,
} from './grounding.ts';

// CB AI Assistant - server side.
//
// The model stays NVIDIA's `mistralai/mistral-nemotron` through the same endpoint as before. What changed:
//   * the assistant is grounded in the CURRENT public CMS records (visible plans, programmes, services and
//     webinars) instead of a fixed keyword list, so hidden / removed records can never be recommended;
//   * replies are streamed from NVIDIA to the browser as they are generated (real server-sent events);
//   * a recommendation is only reported back to the browser when it names a real, currently visible offering.

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'mistralai/mistral-nemotron';

const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY_ITEMS = 24;
const MAX_HISTORY_ITEM_CHARS = 3000;
const MAX_TOKENS = 700;
const REQUEST_TIMEOUT_MS = 90_000;
// Streaming only: healthy requests return their first text within about 5 seconds (measured). If nothing arrives
// within the attempt's limit the upstream connection is stuck, so it is abandoned and retried. Worst case before
// the visitor sees the timeout message: 9 + 9 + 12 = 30 seconds (it was 45).
const FIRST_TOKEN_TIMEOUTS_MS = [9_000, 9_000, 12_000];
const MAX_ATTEMPTS = FIRST_TOKEN_TIMEOUTS_MS.length;
// Once text has started, a stream that goes silent for this long has stalled mid-answer: stop waiting, keep what
// was already shown, and let the visitor retry (previously this waited for the full request timeout).
const STREAM_IDLE_TIMEOUT_MS = 15_000;

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

interface Catalog {
  text: string;
  offerings: Offering[];
  allPrices: Set<string>;
  webinarsAvailable: boolean;
  blockedNames: string[];
  catalogNorm: string;
  liveWebinars: LiveWebinar[];
}

// ---------------------------------------------------------------------------
// Knowledge: built from the same visible CMS records the public pages use.
// ---------------------------------------------------------------------------

// Everything below goes through server/ai/grounding.ts: owner-pending claims (guarantees, refunds, certificates,
// recordings, 24/7 / response times, verification, networks / referrals, statistics, employer / placement claims,
// ratings, availability) are removed from the text before it is sent to the model. Where an item mixes supported
// and unsupported wording only the unsupported clause is removed. Offering names, prices and durations are kept.
const clean = (v: unknown, max = 400) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const digitsOf = (v: unknown) => String(v ?? '').replace(/[^\d.]/g, '').replace(/\.0+$/, '');

async function buildCatalog(): Promise<Catalog> {
  const visible = { visible: { $ne: false } };
  const hidden = { visible: false };
  const [plans, programmes, services, webinars, hiddenMentors, hiddenTestimonials, hiddenWebinars] = await Promise.all([
    Plan.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Programme.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Service.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Webinar.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Mentor.find(hidden).select('name').lean(),
    Testimonial.find(hidden).select('name').lean(),
    Webinar.find(hidden).select('speakerName').lean(),
  ]);
  // Hidden people are never named by the assistant (used only to filter replies; never sent to the model).
  const blockedNames = [
    ...(hiddenMentors as any[]).map((m) => m.name),
    ...(hiddenTestimonials as any[]).map((t) => t.name),
    ...(hiddenWebinars as any[]).map((w) => w.speakerName),
  ]
    .map((n) => clean(n, 120))
    .filter((n) => n.length >= 5);

  const offerings: Offering[] = [];
  const allPrices = new Set<string>();
  const lines: string[] = [];

  lines.push('CAREER PLANS (1:1 guidance plans):');
  for (const p of plans as any[]) {
    const custom = !!p.isCustomPricing;
    const priceDigits = custom ? '' : digitsOf(p.priceINR);
    offerings.push({ name: clean(p.name, 120), type: 'plan', prices: priceDigits ? [priceDigits] : [], customPriced: custom });
    if (priceDigits) allPrices.add(priceDigits);
    const price = custom
      ? `custom pricing${p.customPricingNote ? ` (${neutralizeText(p.customPricingNote, 160)})` : ''}. No fixed price is published; an advisor confirms it`
      : `${clean(p.priceINR, 40)} ${clean(p.period, 60)}`.trim();
    const included = neutralizeList((p.features || []).filter((f: any) => f.included !== false).map((f: any) => f.title), 8, 140);
    const support = neutralizeItem(clean(p.supportType, 100));
    const intro = [neutralizeText(p.tagline, 120), neutralizeText(p.description, 300)].filter(Boolean).join('. ');
    lines.push(
      `- ${clean(p.name, 120)}: ${price}.${intro ? ` ${intro}.` : ''} Sessions: ${clean(p.sessionsCount, 80) || 'n/a'}.` +
        `${support ? ` Support: ${support}.` : ''} Best for: ${neutralizeText(p.bestFor, 200) || 'n/a'}. Includes: ${included.join('; ') || 'n/a'}.`
    );
  }

  lines.push('', 'PROGRAMMES (structured multi-week tracks):');
  for (const p of programmes as any[]) {
    const fee = p.feeINR ? String(p.feeINR) : '';
    offerings.push({ name: clean(p.name, 120), type: 'programme', prices: fee ? [fee] : [] });
    if (fee) allPrices.add(fee);
    const topics = (p.curriculum || []).map((c: any) => neutralizeItem(clean(c.topic, 80))).filter(Boolean).slice(0, 6);
    lines.push(
      `- ${clean(p.name, 120)} (${clean(p.category, 60)}): ${p.feeINR ? rupees(p.feeINR) : 'fee on request'}, ${clean(p.duration, 60) || 'duration n/a'}. ${neutralizeText(p.tagline, 200)}. ` +
        `Covers: ${topics.join('; ') || 'n/a'}. Highlights: ${neutralizeList(p.highlights, 5).join('; ') || 'n/a'}.`
    );
  }

  lines.push('', 'SERVICES (individual sessions and reviews):');
  for (const s of services as any[]) {
    offerings.push({ name: clean(s.title, 120), type: 'service', prices: [] });
    lines.push(
      `- ${clean(s.title, 120)} (${clean(s.category, 60)}): ${neutralizeText(s.shortDescription, 220)}. Duration: ${clean(s.duration, 80) || 'n/a'}. ` +
        `Deliverables: ${neutralizeList(s.deliverables, 5).join('; ') || 'n/a'}. Ideal for: ${neutralizeList(s.idealFor, 3).join('; ') || 'n/a'}.`
    );
  }

  // Only webinars that are still relevant; 'completed' ones are never offered. Speaker employer / designation
  // claims are not sent (unconfirmed), only the speaker's name.
  const liveWebinars = (webinars as any[]).filter((w) => w.status !== 'completed');
  lines.push('', 'LIVE WEBINARS:');
  if (liveWebinars.length === 0) {
    lines.push('- No live webinars are currently scheduled. Do not mention, promise or invent any webinar.');
  } else {
    for (const w of liveWebinars) {
      if (w.priceINR) allPrices.add(String(w.priceINR));
      lines.push(
        `- ${clean(w.title, 160)}: ${clean(w.date, 60)} ${clean(w.time, 60)}, ${w.priceINR ? rupees(w.priceINR) : 'price on the page'}. ` +
          `Speaker: ${clean(w.speakerName, 80) || 'to be announced'}. ${neutralizeText(w.tagline, 200)}.`
      );
    }
  }

  const text = lines.join('\n');
  const liveList: LiveWebinar[] = liveWebinars.map((w) => ({ title: clean(w.title, 160), date: clean(w.date, 60), time: clean(w.time, 60), price: w.priceINR ? rupees(w.priceINR) : '' }));
  return { text, offerings, allPrices, webinarsAvailable: liveWebinars.length > 0, blockedNames, catalogNorm: normalizeName(text), liveWebinars: liveList };
}

// Exported for the test harness only.
export { buildCatalog as __buildCatalogForTests };

// The catalog changes only when an admin edits the CMS, so a short cache removes four database queries
// from almost every request (10 s keeps hidden / edited records from lingering). Concurrent requests share one in-flight build.
const CATALOG_TTL_MS = 10_000;
let catalogCache: { at: number; value: Catalog } | null = null;
let catalogInflight: Promise<Catalog> | null = null;

async function getCatalog(): Promise<Catalog> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.value;
  if (!catalogInflight) {
    catalogInflight = buildCatalog()
      .then((value) => {
        catalogCache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        catalogInflight = null;
      });
  }
  return catalogInflight;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const POLICY_TOPIC = /placement|assured|verified|vetted|job offer|will i get (a )?job/i;

function buildSystemPrompt(catalog: Catalog, latestMessage: string): string {
  const policyNote = POLICY_TOPIC.test(latestMessage)
    ? `

NOTE FOR THIS REPLY: the user's latest message touches a topic that is not confirmed (placement, assured outcomes or verification). Do not state that CareerBuddies does or does not provide it. Say: "${CONFIRMED_SENTENCE}" You may then briefly ask how you can help with their career goal.`
    : '';

  return `You are "CB AI Assistant", the career consultant of CareerBuddies (an Indian career guidance platform for software engineers, product managers, designers, data/AI professionals and technical leaders). You are not a generic chatbot and not an FAQ bot.

GOAL
Understand the user's actual career problem, work out what they really need, and - only when there is a genuine fit - point them to the most relevant CareerBuddies offering from the CATALOG below and explain why it fits. Never push the most expensive option; recommend what matches the person's situation.

HOW TO CONVERSE
1. Read the whole conversation. Remember and reuse what the user already told you (experience, role, goal, timeline, constraints). Never ask again for something already given. Refer to their facts naturally ("With your 8 years in engineering and the move into management...").
2. DISCOVERY FIRST. You need two things: what the person does now (their role or background) and what they want to achieve. If either is missing (for example "How can I grow in my career?", "I need help", "Which plan is right for me?"), do NOT list generic tips and do NOT recommend or promote any offering yet: reply in 1-2 sentences and ask 1-2 short, specific questions. If you already have BOTH (for example "I am in QA and want to move into product management" or "I have a resume but I am not getting shortlisted"), do NOT ask for more: give your view and the recommendation. Ask about years of experience only when the answer would change which offering fits.
3. When you have enough: in one sentence say what you understood, give at most 3 concise pointers that are each tied to a fact the user gave (never a generic checklist), then connect the need to ONE specific catalog offering and say why it fits, mentioning its price and duration exactly as listed when they are listed. If a lighter option would also serve them, say so.
4. Be specific and direct. No motivational filler, no long introductions, no repeating what CareerBuddies is. Usually 80-180 words; shorter for simple questions. Plain language, short paragraphs or bullets.
5. Greetings and small talk: reply briefly and ask what they want help with.
6. Off-topic or non-career questions: say briefly that you help with careers and CareerBuddies, and invite a career question.

TRUTH RULES (very important)
- Offerings, prices, durations and features may ONLY come from the CATALOG. If the user asks about something not in the catalog or that you are not sure about, say: "I don't have confirmed information about that right now. I can connect you with an advisor for the latest details."
- Never invent or mention: mentor names, mentor availability, ratings, reviews, testimonials, webinar dates or speakers, programme start dates, salary or promotion outcomes, statistics or percentages, company affiliations, guarantees, refunds, certificates, recordings, response times, or features that are not in the catalog. Do not say anyone is "verified". Do not create urgency ("only a few seats", "limited time").
- CareerBuddies currently lists no individual mentor profiles publicly; do not name or promise specific mentors, and do not describe mentors' quality, employers or experience.
- Topics that are NOT confirmed: guarantees, refunds, money-back or job-placement promises, certificates, session recordings, response times, mentor verification. For any question about these, do NOT say CareerBuddies does or does not offer them; reply that you don't have confirmed information right now and offer to connect them with an advisor.
- When giving an example (for example how to word a resume bullet) never include real-looking numbers or percentages as facts; use placeholders like [X%].
- Prices are in Indian rupees exactly as listed. Only plans and programmes have listed prices; services have none, so never mention, estimate or write a placeholder for a service price (if asked, say an advisor will share the details). Never quote or estimate a price for a "custom pricing" plan; say it is tailored and an advisor will confirm.
- Webinars: answer ONLY from the LIVE WEBINARS section of the catalog. If it says none are scheduled, state plainly that there are no live webinars scheduled right now (do not use the "no confirmed information" sentence for this) and point to the free Career Check-in or Career Counselling instead. Never invent a webinar, date or speaker.
- Other things on the website you may mention: the free Career Check-in (a short questionnaire that suggests next steps), the free Career Counselling request form (the team follows up), and Resources (career playbooks).
- For general career knowledge (interview prep, resumes, moving into management, etc.) you may give normal professional guidance, but keep it tied to the user's situation and never present it as a CareerBuddies fact or promise an outcome.

GOAL FIT: an offering must serve the role or outcome the user WANTS, not merely their current job. Never recommend a Product Management offering unless the user wants to become a product manager; never recommend a leadership offering to someone who only wants a resume fix; and so on. If nothing in the catalog fits, give useful guidance and offer an advisor instead of forcing an offering.

MATCHING GUIDE (use only offerings that exist in the catalog)
- Resume / LinkedIn problems -> the resume/profile related service or a plan that includes it.
- Interview preparation -> the mock interview / interview related service, system design service, or a plan/programme that includes mocks.
- Switching domain or role -> the career transition / pivot service or transition programme.
- Moving into management or leadership -> the leadership related service or programme.
- Senior executive / director-level or bespoke needs -> "Executive & Premium Plan" ONLY if their situation is genuinely that senior or bespoke; otherwise a lighter option.
- Not sure where to start -> suggest the free Career Check-in or Free Career Counselling, then a plan.

RECOMMENDATION TAG (machine-readable, hidden from the user)
Only when you recommend ONE specific catalog offering after understanding the user's situation, end your reply with exactly one line:
[[REC {"name":"<exact catalog name>","factors":["<fact the user gave>","<another fact>"],"why":"<one short sentence on why it fits>"}]]
- "name" must be copied exactly from the catalog. "factors" are only things the user actually said (2-4 items, short).
Whenever your reply names a catalog offering as the recommended next step, you MUST end with the [[REC ...]] line.
If you gave substantive guidance but are not recommending a specific offering, end with a line containing exactly [[CTA]]. Never add [[CTA]] when your reply ends by asking the user a question.
Do not add any tag to greetings, clarifying questions, off-topic replies, replies that say you lack information, or replies that only say something is not available (for example that no webinars are scheduled). Never mention or explain the tags.

CATALOG (the only source of truth for CareerBuddies offerings):
${catalog.text}${policyNote}`;
}

// ---------------------------------------------------------------------------
// Parsing the hidden tags out of the model output
// ---------------------------------------------------------------------------

interface Recommendation {
  name: string;
  type: Offering['type'];
  factors: string[];
  why: string;
}

// Turns the model's raw output into what the browser is allowed to see. Nothing in the returned object comes
// from the model unchecked: the recommendation must map to exactly one currently visible offering, its factors must
// come from what the user said, and the answer text is stripped of unsupported claims / unknown offerings / wrong
// prices.
export function parseReply(raw: string, catalog: Catalog, userText: string, latestUserMessage = ''): { answer: string; recommendation: Recommendation | null; cta: boolean } {
  const ctx = { offerings: catalog.offerings, allPrices: catalog.allPrices, webinarsAvailable: catalog.webinarsAvailable, blockedNames: catalog.blockedNames, userText, catalogNorm: catalog.catalogNorm };
  let recommendation: Recommendation | null = null;
  let cta = false;

  const text = raw
    .replace(/\[\[REC[\s\S]*?\]\]/g, '')
    .replace(/\[\[CTA\]\]/g, '')
    .replace(/\[\[[\s\S]*$/, '') // an unfinished tag at the very end
    .trim();
  const checked = validateReply(text, ctx);
  if (checked.removed.length) {
    console.warn(`[AI] reply adjusted: ${checked.removed.length} unsupported item(s) removed (${[...new Set(checked.removed.map((r) => r.slice(0, 90)))].join(' | ')})`);
  }
  const answer = checked.answer;
  const replyIsFallback = answer === CONFIRMED_SENTENCE;

  const rec = raw.match(/\[\[REC\s*(\{[\s\S]*?\})\s*\]\]/);
  if (rec && !checked.inventedOffering && !replyIsFallback) {
    try {
      const j = JSON.parse(rec[1]);
      // Exactly one visible offering, never a guess or a substitute.
      const found = matchOffering(j.name, catalog.offerings);
      // ...and it must fit what the visitor asked about (no Product Management programme for a management goal).
      const match = found && offeringRelevant(found.name, userText) ? found : null;
      if (!match && found) console.warn('[AI] recommendation dropped: offering does not fit the visitor\'s stated goal');
      if (match) {
        const why = validateReply(clean(j.why, 300), ctx);
        recommendation = {
          name: match.name,
          type: match.type,
          factors: groundFactors(j.factors, userText),
          why: why.removed.length || why.answer === CONFIRMED_SENTENCE ? '' : why.answer,
        };
        cta = true;
      } else {
        console.warn('[AI] recommendation dropped: name does not map to a single visible offering');
      }
    } catch {
      /* malformed tag: ignore it, the answer text is still shown */
    }
  }
  // The model sometimes names one visible offering in its advice but forgets the tag: use that offering only when the
  // advice names exactly one (see inferRecommendation).
  if (!recommendation && !replyIsFallback && !checked.inventedOffering) {
    const inferred = inferRecommendation(answer, latestUserMessage, catalog.offerings);
    if (inferred) {
      recommendation = { name: inferred.name, type: inferred.type, factors: [], why: '' };
      cta = true;
    }
  }
  if (/\[\[CTA\]\]/.test(raw) && !replyIsFallback) cta = true;
  // A reply that mainly asks the visitor a question (discovery) gets no CTA button.
  if (!recommendation && isDiscoveryReply(answer)) cta = false;
  // Decision log (no visitor text): what the model tagged and what the server decided.
  console.log(`[AI] decision: modelTag=${rec ? 'REC' : /\[\[CTA\]\]/.test(raw) ? 'CTA' : 'none'} recommendation=${recommendation ? 'yes' : 'no'} cta=${cta} invented=${checked.inventedOffering} fallback=${replyIsFallback}`);

  return { answer, recommendation, cta };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

type ErrorCode = 'timeout' | 'busy' | 'failed';
const USER_ERROR: Record<ErrorCode, string> = {
  timeout: "I'm taking longer than expected to process this. Please try again.",
  busy: 'Something went wrong. Please try again.',
  failed: 'Something went wrong. Please try again.',
};

function validate(body: any): { message: string; history: HistoryMessage[] } | { error: string } {
  const { message, history, profile } = body || {};
  if (!message || typeof message !== 'string' || !message.trim()) return { error: 'Message is required' };
  if (message.length > MAX_MESSAGE_CHARS) return { error: `Message is too long (maximum ${MAX_MESSAGE_CHARS} characters).` };
  if (history !== undefined && history !== null && !Array.isArray(history)) return { error: 'Invalid conversation history.' };
  // `profile` is an optional field of the original API contract; it is validated (and otherwise ignored).
  if (profile !== undefined && profile !== null && (typeof profile !== 'object' || Array.isArray(profile))) return { error: 'Invalid profile.' };
  const safe: HistoryMessage[] = (Array.isArray(history) ? history : [])
    .filter((h: any) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim())
    .slice(-MAX_HISTORY_ITEMS)
    .map((h: any) => ({ role: h.role, content: h.content.slice(0, MAX_HISTORY_ITEM_CHARS) }));
  return { message: message.trim(), history: safe };
}

export async function aiChatHandler(req: Request, res: Response) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const parsed = validate(req.body);
  if ('error' in parsed) return void res.status(400).json({ success: false, error: parsed.error });
  if (!apiKey) {
    console.error('[AI] NVIDIA_API_KEY is not configured');
    return void res.status(503).json({ success: false, code: 'failed', error: USER_ERROR.failed });
  }

  const wantsStream = req.body?.stream !== false;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  let firstTokenTimer: ReturnType<typeof setTimeout> | null = null;
  const clearTimers = () => {
    clearTimeout(timer);
    if (firstTokenTimer) clearTimeout(firstTokenTimer);
  };
  // If the visitor closes the tab / cancels, stop paying for the generation.
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  let headersSent = false;
  const sse = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const fail = (code: ErrorCode, status: number) => {
    clearTimers();
    if (wantsStream && headersSent) {
      sse('error', { code, error: USER_ERROR[code] });
      return void res.end();
    }
    return void res.status(status).json({ success: false, code, error: USER_ERROR[code] });
  };

  try {
    const catalog = await getCatalog();
    const userText = [...parsed.history.filter((h) => h.role === 'user').map((h) => h.content), parsed.message].join('\n');

    // Explicit questions about unconfirmed policies (guarantee, refund, certificate, recording, response time, ...)
    // are answered by the server with the confirmed-information reply. They are never sent to the model, so a
    // model cannot invent a policy. (Nothing is streamed here: the reply is a single final message.)
    if (isPolicyQuestion(parsed.message)) {
      clearTimers();
      const body = { answer: POLICY_ANSWER, recommendation: null, cta: false, webinarsAvailable: catalog.webinarsAvailable, source: 'server' };
      if (!wantsStream) return void res.json({ success: true, ...body });
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.flushHeaders();
      headersSent = true;
      sse('done', body);
      return void res.end();
    }

    // Whether a webinar is available is a fact in the catalog, so the server answers those questions itself (exact,
    // instant, and always consistent with the Webinar button).
    if (isWebinarQuestion(parsed.message)) {
      clearTimers();
      const body = { answer: webinarAnswer(catalog.liveWebinars), recommendation: null, cta: catalog.webinarsAvailable, webinarsAvailable: catalog.webinarsAvailable, source: 'server' };
      if (!wantsStream) return void res.json({ success: true, ...body });
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.flushHeaders();
      headersSent = true;
      sse('done', body);
      return void res.end();
    }

    const messages = [
      { role: 'system', content: buildSystemPrompt(catalog, parsed.message) },
      ...parsed.history,
      { role: 'user', content: parsed.message },
    ];
    const payload = (stream: boolean) =>
      JSON.stringify({ model: NVIDIA_MODEL, messages, max_tokens: MAX_TOKENS, temperature: 0.3, stream });

    console.log(`[AI] request (${parsed.message.length} chars, ${parsed.history.length} history, stream=${wantsStream})`);

    // ---------- plain JSON mode (single attempt; the chat UI uses streaming) ----------
    if (!wantsStream) {
      const upstream = await fetch(NVIDIA_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: payload(false),
        signal: controller.signal,
      });
      if (!upstream.ok) {
        console.error('[AI] upstream error status', upstream.status);
        return fail(upstream.status === 429 ? 'busy' : 'failed', 502);
      }
      const data: any = await upstream.json();
      clearTimers();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw || typeof raw !== 'string') {
        console.error('[AI] empty upstream response');
        return void res.status(502).json({ success: false, code: 'failed', error: USER_ERROR.failed });
      }
      const { answer, recommendation, cta } = parseReply(raw, catalog, userText, parsed.message);
      return void res.json({ success: true, answer, recommendation, cta, webinarsAvailable: catalog.webinarsAvailable, model: NVIDIA_MODEL });
    }

    // ---------- streaming mode (real SSE from NVIDIA, forwarded as it arrives) ----------
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    headersSent = true;

    let raw = '';
    let sent = 0;
    // Why the last attempt failed: a stall (no text for too long) reads as a timeout to the visitor, whereas an
    // immediate provider error is a plain "something went wrong".
    const failure = { last: 'error' as 'stall' | 'error' };

    // Text is forwarded up to (but not including) the first "[[" so the hidden tag never reaches the browser.
    const flushSafe = () => {
      const tagAt = raw.indexOf('[[');
      let end = tagAt >= 0 ? tagAt : raw.length;
      if (tagAt < 0 && raw.endsWith('[')) end -= 1; // could be the start of a tag
      if (end > sent) {
        sse('delta', { text: raw.slice(sent, end) });
        sent = end;
      }
    };

    // One upstream attempt. Returns 'ok' when a complete answer was streamed, or 'retry' when the provider
    // failed / stalled before producing any text (safe to try again without the visitor noticing).
    const attemptStream = async (attemptNo: number): Promise<'ok' | 'retry'> => {
      const attempt = new AbortController();
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      const relay = () => attempt.abort();
      controller.signal.addEventListener('abort', relay);
      let stalled = false;
      firstTokenTimer = setTimeout(() => {
        stalled = true;
        attempt.abort();
      }, FIRST_TOKEN_TIMEOUTS_MS[Math.min(attemptNo, FIRST_TOKEN_TIMEOUTS_MS.length) - 1]);
      try {
        const upstream = await fetch(NVIDIA_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: payload(true),
          signal: attempt.signal,
        });
        if (!upstream.ok || !upstream.body) {
          console.error('[AI] upstream error status', upstream.status);
          failure.last = 'error';
          return raw ? 'ok' : upstream.status === 429 ? 'ok' : 'retry';
        }
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const armIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            if (raw) {
              timedOut = true; // reported to the visitor as a timeout; the partial text stays on screen
              attempt.abort();
            }
          }, STREAM_IDLE_TIMEOUT_MS);
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (raw) armIdle();
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const piece = JSON.parse(data)?.choices?.[0]?.delta?.content;
              if (typeof piece === 'string' && piece) {
                if (firstTokenTimer) {
                  clearTimeout(firstTokenTimer);
                  firstTokenTimer = null;
                }
                raw += piece;
                armIdle();
                flushSafe();
              }
            } catch {
              /* ignore keep-alive / non-JSON lines */
            }
          }
        }
        return 'ok';
      } catch (error: any) {
        // Nothing reached the visitor yet: a stall or connection error can be retried.
        if (!raw && !controller.signal.aborted && (stalled || error?.name !== 'AbortError')) {
          failure.last = stalled ? 'stall' : 'error';
          return 'retry';
        }
        if (!raw && stalled && !controller.signal.aborted) {
          failure.last = 'stall';
          return 'retry';
        }
        throw error;
      } finally {
        if (idleTimer) clearTimeout(idleTimer);
        controller.signal.removeEventListener('abort', relay);
        if (firstTokenTimer) {
          clearTimeout(firstTokenTimer);
          firstTokenTimer = null;
        }
      }
    };

    let outcome = await attemptStream(1);
    for (let attempt = 2; attempt <= MAX_ATTEMPTS && outcome === 'retry' && !raw; attempt++) {
      console.warn(`[AI] upstream stalled or failed before any text; retrying (attempt ${attempt}/${MAX_ATTEMPTS})`);
      // Lets the chat show "Still working on it..." instead of a silent wait. Ignored by older clients.
      sse('status', { retrying: true, attempt });
      // A provider error that came back instantly gets a short pause; a stall has already waited long enough.
      if (failure.last === 'error') await new Promise((resolve) => setTimeout(resolve, 600));
      outcome = await attemptStream(attempt);
    }

    clearTimers();
    if (!raw.trim()) {
      console.error('[AI] no text from the model after retry');
      return fail(outcome === 'retry' && failure.last === 'stall' ? 'timeout' : 'failed', 502);
    }
    const { answer, recommendation, cta } = parseReply(raw, catalog, userText, parsed.message);
    sse('done', { answer, recommendation, cta, webinarsAvailable: catalog.webinarsAvailable, model: NVIDIA_MODEL });
    res.end();
  } catch (error: any) {
    if (timedOut) {
      console.error('[AI] request timed out');
      return fail('timeout', 504);
    }
    if (error?.name === 'AbortError') return void res.end(); // visitor left
    console.error('[AI] server error:', error?.name || 'Error', error?.message || '');
    return fail('failed', 502);
  }
}
