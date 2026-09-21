import { Request, Response } from 'express';
import { Plan } from '../models/Plan.ts';
import { Programme } from '../models/Programme.ts';
import { Service } from '../models/Service.ts';
import { Webinar } from '../models/Webinar.ts';

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
const REQUEST_TIMEOUT_MS = 120_000;
// Streaming only: healthy requests return their first text within a few seconds. If nothing arrives in this
// time the upstream connection is stuck, so it is abandoned and retried (up to MAX_ATTEMPTS attempts) before giving up.
const FIRST_TOKEN_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

interface Offering {
  name: string;
  type: 'plan' | 'programme' | 'service';
}

interface Catalog {
  text: string;
  offerings: Offering[];
  webinarsAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Knowledge: built from the same visible CMS records the public pages use.
// ---------------------------------------------------------------------------

// Claims that are still waiting for owner confirmation are never fed to the model, so the assistant
// cannot repeat them (guarantees / refunds, response-time promises, network access, "verified", etc.).
const UNCONFIRMED = /guarantee|satisf|refund|network|verified|top-tier|proprietary|24\/7|hotline|lifelong|referral|masterminds|unlimited|certificate|recording|concierge/i;

const clean = (v: unknown, max = 400) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const keep = (list: unknown, max = 8) =>
  (Array.isArray(list) ? list : []).map((s) => clean(s, 160)).filter((s) => s && !UNCONFIRMED.test(s)).slice(0, max);
const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

async function buildCatalog(): Promise<Catalog> {
  const visible = { visible: { $ne: false } };
  const [plans, programmes, services, webinars] = await Promise.all([
    Plan.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Programme.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Service.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    Webinar.find(visible).sort({ displayOrder: 1, createdAt: 1 }).lean(),
  ]);

  const offerings: Offering[] = [];
  const lines: string[] = [];

  lines.push('CAREER PLANS (1:1 guidance plans):');
  for (const p of plans as any[]) {
    offerings.push({ name: p.name, type: 'plan' });
    const price = p.isCustomPricing
      ? `custom pricing${p.customPricingNote ? ` (${clean(p.customPricingNote, 160)})` : ''}`
      : `${clean(p.priceINR, 40)} ${clean(p.period, 60)}`.trim();
    const included = (p.features || []).filter((f: any) => f.included !== false).map((f: any) => clean(f.title, 140)).filter((t: string) => t && !UNCONFIRMED.test(t)).slice(0, 8);
    const support = clean(p.supportType, 100);
    lines.push(
      `- ${p.name}: ${price}. ${clean(p.tagline, 120)}. ${clean(p.description, 300)} Sessions: ${clean(p.sessionsCount, 80) || 'n/a'}.` +
        `${support && !UNCONFIRMED.test(support) ? ` Support: ${support}.` : ''} Best for: ${clean(p.bestFor, 200) || 'n/a'}. Includes: ${included.join('; ') || 'n/a'}.`
    );
  }

  lines.push('', 'PROGRAMMES (structured multi-week tracks):');
  for (const p of programmes as any[]) {
    offerings.push({ name: p.name, type: 'programme' });
    const topics = (p.curriculum || []).map((c: any) => clean(c.topic, 80)).filter(Boolean).slice(0, 6);
    lines.push(
      `- ${p.name} (${clean(p.category, 60)}): ${p.feeINR ? rupees(p.feeINR) : 'fee on request'}, ${clean(p.duration, 60) || 'duration n/a'}. ${clean(p.tagline, 200)} ` +
        `Covers: ${topics.join('; ') || 'n/a'}. Highlights: ${keep(p.highlights, 5).join('; ') || 'n/a'}.`
    );
  }

  lines.push('', 'SERVICES (individual sessions and reviews):');
  for (const s of services as any[]) {
    offerings.push({ name: s.title, type: 'service' });
    lines.push(
      `- ${s.title} (${clean(s.category, 60)}): ${clean(s.shortDescription, 220)} Duration: ${clean(s.duration, 80) || 'n/a'}. ` +
        `Deliverables: ${keep(s.deliverables, 5).join('; ') || 'n/a'}. Ideal for: ${keep(s.idealFor, 3).join('; ') || 'n/a'}.`
    );
  }

  // Only webinars that are still relevant; 'completed' ones are never offered.
  const liveWebinars = (webinars as any[]).filter((w) => w.status !== 'completed');
  lines.push('', 'LIVE WEBINARS:');
  if (liveWebinars.length === 0) {
    lines.push('- No live webinars are currently scheduled. Do not mention, promise or invent any webinar.');
  } else {
    for (const w of liveWebinars) {
      lines.push(
        `- ${w.title}: ${clean(w.date, 60)} ${clean(w.time, 60)}, ${w.priceINR ? rupees(w.priceINR) : 'price on the page'}. ` +
          `Speaker: ${clean(w.speakerName, 80)} (${clean(w.speakerDesignation, 80)}). ${clean(w.tagline, 200)}`
      );
    }
  }

  return { text: lines.join('\n'), offerings, webinarsAvailable: liveWebinars.length > 0 };
}

// The catalog changes only when an admin edits the CMS, so a short cache removes four database queries
// from almost every request. Concurrent requests share one in-flight build.
const CATALOG_TTL_MS = 30_000;
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

const POLICY_TOPIC = /guarante|refund|money.?back|certificat|placement|assured|recording|response time|how (soon|fast|quickly)|verified|vetted/i;

function buildSystemPrompt(catalog: Catalog, latestMessage: string): string {
  const policyNote = POLICY_TOPIC.test(latestMessage)
    ? `

NOTE FOR THIS REPLY: the user's latest message touches a topic that is not confirmed (guarantee, refund, certificate, placement, recording, response time or verification). Do not state that CareerBuddies does or does not provide it. Say: "I don't have confirmed information about that right now. I can connect you with an advisor for the latest details." You may then briefly ask how you can help with their career goal.`
    : '';

  return `You are "CB AI Assistant", the career consultant of CareerBuddies (an Indian career guidance platform for software engineers, product managers, designers, data/AI professionals and technical leaders). You are not a generic chatbot and not an FAQ bot.

GOAL
Understand the user's actual career problem, work out what they really need, and - only when there is a genuine fit - point them to the most relevant CareerBuddies offering from the CATALOG below and explain why it fits. Never push the most expensive option; recommend what matches the person's situation.

HOW TO CONVERSE
1. Read the whole conversation. Remember and reuse what the user already told you (experience, role, goal, timeline, constraints). Never ask again for something already given. Refer to their facts naturally ("With your 8 years in engineering and the move into management...").
2. DISCOVERY FIRST. You need at least the person's current role/experience and what they want to achieve. If either is missing (for example "How can I grow in my career?", "I need help", "Which plan is right for me?"), do NOT list generic tips and do NOT recommend or promote any offering yet: reply in 1-2 sentences and ask 1-2 short, specific questions (for example current role and years of experience, and the goal). If you already have enough, do not ask questions.
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
If you gave substantive guidance but are not recommending a specific offering, end with a line containing exactly [[CTA]].
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

function parseReply(raw: string, catalog: Catalog): { answer: string; recommendation: Recommendation | null; cta: boolean } {
  let recommendation: Recommendation | null = null;
  let cta = false;

  const rec = raw.match(/\[\[REC\s*(\{[\s\S]*?\})\s*\]\]/);
  if (rec) {
    try {
      const j = JSON.parse(rec[1]);
      const wanted = clean(j.name, 200).toLowerCase();
      const match = catalog.offerings.find((o) => o.name.toLowerCase() === wanted) || catalog.offerings.find((o) => wanted && (o.name.toLowerCase().includes(wanted) || wanted.includes(o.name.toLowerCase())));
      // A recommendation is only shown when it names a real, currently visible offering.
      if (match) {
        recommendation = {
          name: match.name,
          type: match.type,
          factors: (Array.isArray(j.factors) ? j.factors : []).map((f: unknown) => clean(f, 160)).filter(Boolean).slice(0, 5),
          why: clean(j.why, 300),
        };
        cta = true;
      }
    } catch {
      /* malformed tag: ignore it, the answer text is still shown */
    }
  }
  if (/\[\[CTA\]\]/.test(raw)) cta = true;

  const answer = raw
    .replace(/\[\[REC[\s\S]*?\]\]/g, '')
    .replace(/\[\[CTA\]\]/g, '')
    .replace(/\[\[[\s\S]*$/, '') // an unfinished tag at the very end
    .trim();

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
  const { message, history } = body || {};
  if (!message || typeof message !== 'string' || !message.trim()) return { error: 'Message is required' };
  if (message.length > MAX_MESSAGE_CHARS) return { error: `Message is too long (maximum ${MAX_MESSAGE_CHARS} characters).` };
  if (history !== undefined && history !== null && !Array.isArray(history)) return { error: 'Invalid conversation history.' };
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
      const { answer, recommendation, cta } = parseReply(raw, catalog);
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
    const attemptStream = async (): Promise<'ok' | 'retry'> => {
      const attempt = new AbortController();
      const relay = () => attempt.abort();
      controller.signal.addEventListener('abort', relay);
      let stalled = false;
      firstTokenTimer = setTimeout(() => {
        stalled = true;
        attempt.abort();
      }, FIRST_TOKEN_TIMEOUT_MS);
      try {
        const upstream = await fetch(NVIDIA_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: payload(true),
          signal: attempt.signal,
        });
        if (!upstream.ok || !upstream.body) {
          console.error('[AI] upstream error status', upstream.status);
          return raw ? 'ok' : upstream.status === 429 ? 'ok' : 'retry';
        }
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
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
        if (!raw && !controller.signal.aborted && (stalled || error?.name !== 'AbortError')) return 'retry';
        if (!raw && stalled && !controller.signal.aborted) return 'retry';
        throw error;
      } finally {
        controller.signal.removeEventListener('abort', relay);
        if (firstTokenTimer) {
          clearTimeout(firstTokenTimer);
          firstTokenTimer = null;
        }
      }
    };

    let outcome = await attemptStream();
    for (let attempt = 2; attempt <= MAX_ATTEMPTS && outcome === 'retry' && !raw; attempt++) {
      console.warn(`[AI] upstream stalled or failed before any text; retrying (attempt ${attempt}/${MAX_ATTEMPTS})`);
      outcome = await attemptStream();
    }

    clearTimers();
    if (!raw.trim()) {
      console.error('[AI] no text from the model after retry');
      return fail(outcome === 'retry' ? 'timeout' : 'failed', 502);
    }
    const { answer, recommendation, cta } = parseReply(raw, catalog);
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
