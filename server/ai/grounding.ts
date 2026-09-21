// CB AI Assistant - grounding rules.
//
// Pure functions (no database, no network) that keep the assistant tied to what CareerBuddies has actually
// confirmed. They do two jobs:
//   1. BEFORE the model: strip owner-pending claims out of the CMS text that is sent to NVIDIA.
//   2. AFTER the model: validate the reply (offering names, prices, webinars, unsupported claims, factors) and
//      remove anything that is not backed by the current visible catalog.

export const CONFIRMED_SENTENCE =
  "I don't have confirmed information about that right now. I can connect you with an advisor for the latest details.";

export interface Offering {
  name: string;
  type: 'plan' | 'programme' | 'service';
  // Digits-only prices that are actually published for this offering (empty for services / custom pricing).
  prices: string[];
  customPriced?: boolean;
}

// ---------------------------------------------------------------------------
// 1. Neutralising CMS text before it reaches the model
// ---------------------------------------------------------------------------

// Pure modifiers: the word itself is removed, the rest of the (supported) text is kept.
const STRIP_WORDS =
  /\b(verified|vetted|hand-?picked|top[- ]?tier|top[- ]?rated|elite|proven|committee-proven|exclusive|vip|proprietary|premier|world[- ]class|best[- ]in[- ]class|unlimited|priority|dedicated 24\/7|ats-proof)\b/gi;

// Claims that are owner-pending or unsupported. A segment containing any of these is dropped.
const UNSUPPORTED_SEGMENT = new RegExp(
  [
    // guarantees / refunds / satisfaction / rematch
    '\\bguarantee\\w*', '\\bassured\\b', '\\brefund\\w*', 'money[- ]?back', '\\bsatisf\\w+', '\\brematch\\w*',
    // certificates / accreditation / recordings
    '\\bcertificat\\w*', '\\baccredit\\w*', '\\brecordings?\\b', '\\brecorded\\b', 'playback',
    // support hours / response promises
    '24\\s*[/x]\\s*7', '\\bhotline\\b', '\\bconcierge\\b', 'round[- ]the[- ]clock',
    '\\bwithin \\d+\\s*(?:hours?|hrs?|business hours|minutes?|mins?|days?)\\b', '\\b(?:respon(?:d|ds|se|ding)|repl(?:y|ies)) (?:within|in under|in less than|in \\d)',
    // verification / networks / referrals / introductions
    '\\bnetworks?\\b', '\\breferrals?\\b', '\\balumni\\b', '\\bmasterminds?\\b', '\\bintroductions?\\b', '\\bsenior executive access\\b',
    // vague prestige / employer / company claims
    '\\btop[- ]?(?:tech|global|technology|companies|\\d+)\\b', '\\btier[- ]?1\\b', '\\bfaang\\b', '\\bmnc\\b', '\\bfortune ?500\\b',
    '\\b(?:google|meta|apple|stripe|airbnb|uber|amazon|microsoft|deepmind|openai|netflix|spotify|scale ai|square|paypal|flipkart|infosys|tcs)\\b',
    // statistics / percentages / outcome claims
    '\\d+(?:\\.\\d+)?\\s*%', '\\bpercent\\b', '\\b\\d+\\s*x\\b', '\\b\\d{2,}\\+', '\\buplift\\b', '\\bhikes?\\b',
    '\\baverage\\b[^.]{0,40}\\b(?:increase|salary|compensation|hike|uplift)\\b', '\\bpay ?raise\\b',
    '\\bsuccess (?:rate|stor)\\w*', '\\bplaced\\b', '\\bplacements?\\b', '\\bhired\\b', '\\bsecure\\b[^.]{0,30}\\boffers?\\b',
    // ratings / reviews / availability
    '\\bratings?\\b', '\\bfive[- ]star\\b', '\\bsessions completed\\b', '\\blimited (?:seats|slots|time|spots)\\b',
    '\\bonly \\d+ (?:seats|slots|spots)\\b', '\\bfew (?:seats|slots|spots)\\b', '\\bslots?\\b',
    '\\bavailab\\w+\\s*(?:now|today|immediately|anytime)\\b',
  ].join('|'),
  'i'
);

const isBad = (segment: string) => UNSUPPORTED_SEGMENT.test(segment);

const DELIMITER = /(\s*(?:[,;:|—–]|\s-\s|\bwith\b|\bfrom\b|\bacross\b|\bby\b|\band\b|&)\s*)/i;

const tidy = (s: string) =>
  s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,;:.])/g, '$1')
    .replace(/[\s,;:|—–-]+$/g, '')
    .replace(/^[\s,;:|—–-]+/g, '')
    .trim();

// One sentence / list item. Returns '' when nothing supported is left.
export function neutralizeItem(text: string): string {
  const stripped = String(text || '').replace(STRIP_WORDS, ' ');
  const parts = stripped.split(DELIMITER);
  // parts = [text, delimiter, text, delimiter, ...]
  if (isBad(parts[0])) return ''; // the head of the item is the unsupported claim: drop the whole item
  let out = parts[0];
  for (let i = 1; i < parts.length; i += 2) {
    const segment = parts[i + 1] ?? '';
    if (isBad(segment)) continue; // drop only the unsupported clause, keep the rest
    out += parts[i] + segment;
  }
  // "backed by <dropped claim>" must not leave a dangling "backed"
  const result = tidy(out).replace(/\s+(?:backed|covered|protected|supported|assured|ensured|certified|accredited)$/i, '').trim();
  return /[a-z0-9]{3,}/i.test(result) ? result : '';
}

// Free text (descriptions, taglines): sentence by sentence.
export function neutralizeText(text: string, max = 400): string {
  const sentences = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/);
  const kept = sentences.map((s) => neutralizeItem(s.replace(/[.!?]+$/, ''))).filter(Boolean);
  return kept.join('. ').slice(0, max);
}

export function neutralizeList(list: unknown, max = 8, itemMax = 160): string[] {
  return (Array.isArray(list) ? list : [])
    .map((item) => neutralizeItem(String(item || '')).slice(0, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

// ---------------------------------------------------------------------------
// 2. Recommendation / offering matching
// ---------------------------------------------------------------------------

const GENERIC_WORDS = /\b(the|plan|programme|program|track|service|package|offering)\b/g;

export const normalizeName = (s: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const shortName = (s: string) => normalizeName(s).replace(GENERIC_WORDS, ' ').replace(/\s+/g, ' ').trim();

// Strict: exact normalised name, or the name without generic words ("Explore" -> "Explore Plan"), and only when
// that maps to exactly ONE visible offering. Anything else returns null (no guessing, no substitution).
export function matchOffering(name: unknown, offerings: Offering[]): Offering | null {
  const wanted = normalizeName(String(name || ''));
  if (!wanted) return null;
  const exact = offerings.filter((o) => normalizeName(o.name) === wanted);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const shortWanted = shortName(String(name || ''));
  if (shortWanted.length < 4) return null;
  const loose = offerings.filter((o) => shortName(o.name) === shortWanted);
  return loose.length === 1 ? loose[0] : null;
}

// Relevance: an offering that is about a specific topic (product management, resumes, system design, ...) is only
// recommended when the visitor actually talked about that topic. This stops a real, visible offering from being
// recommended for the wrong goal (for example the Product Management programme for someone who wants to become an
// engineering manager). Offerings whose names do not map to a topic (Explore, Elevate, Dedicated Career Acceleration,
// Strategic Career Counseling, ...) are general and pass.
const TOPIC_RULES: Array<[RegExp, RegExp]> = [
  [/product/i, /\bproducts?\b|\bpm\b|\bapm\b|product manag/i],
  [/resume|linkedin/i, /resume|\bcv\b|linkedin|shortlist|\bats\b|profile|applications?\b|callbacks?|interview calls?|not (getting|hearing)/i],
  [/system design|architecture/i, /system design|distributed|architect|scalab|staff|\bl5\b|\bl6\b|microservice/i],
  [/interview/i, /interview|mock|\bdsa\b|coding round|preparing|prepare/i],
  [/salary|negotiation/i, /salary|compensation|negotiat|offers?\b|\bpay\b|equity|\bhike\b|\bctc\b/i],
  [/promotion|appraisal/i, /promot|appraisal|performance review|level(?:ing|s)?\b|next level|senior|staff/i],
  [/founder|startup/i, /founder|start-?up|\bmvp\b|entrepreneur/i],
  [/machine learning|applied ai/i, /\bai\b|machine learning|\bml\b|\bllm\b|data scien|genai|generative/i],
  [/global|relocation/i, /abroad|relocat|visa|international|overseas|\bus\b|\buk\b|canada|singapore|germany|europe/i],
  [/campus|launchpad/i, /fresher|graduate|campus|student|college|entry[- ]level|first job|early career|junior|0-?3 years/i],
  [/leadership|executive/i, /leader|manag|director|\bvp\b|\bcto\b|\bceo\b|head of|executive|\bexec\b|team lead|people manag/i],
  [/transition|pivot/i, /switch|transition|pivot|change (?:my )?(?:career|field|domain|role)|mov(?:e|ing) (?:into|to)|shift/i],
];

export function offeringRelevant(offeringName: string, userText: string): boolean {
  if (!userText) return true; // no conversation text to judge against: do not block
  const rule = TOPIC_RULES.find(([nameRe]) => nameRe.test(offeringName));
  return rule ? rule[1].test(userText) : true;
}

// Facts listed in the "Why this recommendation?" card must have been said by the user.
const STOP = new Set(['with', 'that', 'this', 'from', 'have', 'wants', 'want', 'user', 'looking', 'about', 'their', 'into', 'your', 'and', 'the', 'for', 'years', 'year']);
export function groundFactors(factors: unknown, userText: string): string[] {
  const said = userText.toLowerCase();
  return (Array.isArray(factors) ? factors : [])
    .map((f) => String(f || '').replace(/\s+/g, ' ').trim().slice(0, 160))
    .filter((f) => {
      if (!f || isBad(f)) return false;
      const tokens: string[] = f.toLowerCase().match(/[a-z0-9+]+/g) || [];
      const numbers = tokens.filter((t) => /\d/.test(t));
      if (numbers.some((n) => !said.includes(n))) return false;
      const words: string[] = tokens.filter((t) => t.length >= 4 && !STOP.has(t) && !/\d/.test(t));
      if (words.length === 0) return numbers.length > 0;
      return words.some((w) => said.includes(w.slice(0, Math.max(4, w.length - 2))));
    })
    .slice(0, 5);
}

// ---------------------------------------------------------------------------
// 3. Validating the model's reply
// ---------------------------------------------------------------------------

// Claims the reply may never contain (as its own assertion), whatever the model decided to write.
const UNSAFE_REPLY = new RegExp(
  [
    '\\bguarantee[ds]?\\b', '\\brefunds?\\b', 'money[- ]?back', '\\bcertificat\\w*', '\\brecordings?\\b',
    '24\\s*[/x]\\s*7', '\\bhotline\\b', '\\bconcierge\\b', '\\bratings?\\b', '\\bfive[- ]star\\b',
    '\\bverified\\b', '\\bvetted\\b', '\\btop[- ]?tier\\b', '\\btier[- ]?1\\b', '\\bfaang\\b',
    '\\b(?:google|meta|apple|stripe|airbnb|uber|amazon|microsoft|deepmind|openai|netflix|spotify|scale ai)\\b',
    '\\d+(?:\\.\\d+)?\\s*%(?!\\])', '\\bsuccess rate\\b', '\\bplaced\\b', '\\bslots?\\b', '\\blimited (?:seats|time|spots)\\b',
    '\\bwithin \\d+\\s*(?:hours?|business hours|minutes?|days?)\\b',
  ].join('|'),
  'i'
);

const OFFERING_WORD = /\b(plan|programme|program|track|service|package|course|bootcamp|blueprint|sprint|cohort|masterclass|workshop|launchpad)\b/i;
const OFFERING_PHRASE = /([A-Z][\w+\-]*(?:\s+(?:&\s+)?[A-Z][\w+\-]*){0,6}\s+(?:Plan|Programme|Program|Track|Blueprint|Sprint|Launchpad))/g;
const AMOUNT = /(?:₹|Rs\.?\s?|INR\s?)\s?([\d][\d,]*(?:\.\d+)?)/g;

export interface ReplyContext {
  offerings: Offering[];
  allPrices: Set<string>;
  webinarsAvailable: boolean;
  // Names of people whose CMS records are hidden (demo mentors, speakers, testimonial authors). The assistant must
  // not repeat them, even when the visitor typed one.
  blockedNames?: string[];
  // Everything the visitor has said in this conversation (used for the relevance check).
  userText?: string;
  // Normalised text of the catalog itself. A phrase copied from it (a feature or deliverable name) is real content,
  // not an invented offering.
  catalogNorm?: string;
}

export interface ReplyCheck {
  answer: string;
  removed: string[]; // human-readable reasons, for server logs only
  inventedOffering: boolean;
}

const looksLikeName = (candidate: string, offerings: Offering[], catalogNorm?: string) => {
  const n = normalizeName(candidate);
  if (n.length < 5) return true; // too short to judge: not treated as an invented offering
  if (catalogNorm && catalogNorm.includes(n)) return true; // wording that exists in the catalog itself
  return offerings.some((o) => {
    const on = normalizeName(o.name);
    return on === n || on.includes(n) || n.includes(on) || shortName(o.name) === shortName(candidate);
  });
};

function unitProblem(unit: string, ctx: ReplyContext): string | null {
  const lower = unit.toLowerCase();
  if (ctx.blockedNames?.some((n) => n.length >= 5 && lower.includes(n.toLowerCase()))) return 'hidden person named';
  if (lower.includes('confirmed information')) return null; // our own "not confirmed" sentence is always fine

  if (UNSAFE_REPLY.test(unit)) return 'unsupported claim';

  // Webinars: with none scheduled, only a plain "there are none" statement is allowed.
  if (!ctx.webinarsAvailable && /\b(webinars?|masterclasses?)\b/i.test(unit) && !/\b(no|not|isn'?t|aren'?t|don'?t|none|currently)\b/i.test(unit)) {
    return 'webinar mentioned but none scheduled';
  }

  // Offering names that are not in the visible catalog.
  const bold = [...unit.matchAll(/\*\*([^*]{3,90})\*\*/g)].map((m) => m[1].replace(/["“”']/g, '').trim());
  for (const b of bold) {
    if (OFFERING_WORD.test(b) && !looksLikeName(b, ctx.offerings, ctx.catalogNorm)) return `unknown offering "${b}"`;
  }
  for (const m of unit.matchAll(OFFERING_PHRASE)) {
    if (!looksLikeName(m[1], ctx.offerings, ctx.catalogNorm)) return `unknown offering "${m[1]}"`;
  }

  // Relevance: never push an offering that does not fit what the visitor is asking about.
  const namedHere = ctx.offerings.filter((o) => {
    const n = normalizeName(unit);
    return n.includes(normalizeName(o.name)) || (shortName(o.name).length >= 4 && n.includes(shortName(o.name)));
  });
  if (ctx.userText && namedHere.some((o) => !offeringRelevant(o.name, ctx.userText as string))) return 'irrelevant offering';

  // Prices: every rupee amount must belong to the offering named in the same sentence (or be a published price).
  const amounts = [...unit.matchAll(AMOUNT)].map((m) => m[1].replace(/,/g, '').replace(/\.0+$/, ''));
  if (amounts.length) {
    const named = ctx.offerings.filter((o) => {
      const n = normalizeName(unit);
      return n.includes(normalizeName(o.name)) || (shortName(o.name).length >= 4 && n.includes(shortName(o.name)));
    });
    const allowed = named.length ? new Set(named.flatMap((o) => o.prices)) : ctx.allPrices;
    if (amounts.some((a) => !allowed.has(a))) return 'price does not match the named offering';
  }
  return null;
}

// Splits into line-level units (keeping list structure) and sentence-level units inside paragraphs.
export function validateReply(reply: string, ctx: ReplyContext): ReplyCheck {
  const removed: string[] = [];
  let inventedOffering = false;
  const lines = reply.replace(/\r\n/g, '\n').split('\n');
  const outLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      outLines.push(line);
      continue;
    }
    const prefix = (line.match(/^\s*(?:[-*]\s+|\d+[.)]\s+|#{1,3}\s+)?/) || [''])[0];
    const body = line.slice(prefix.length);
    const sentences = body.split(/(?<=[.!?])\s+/);
    const kept: string[] = [];
    for (const s of sentences) {
      const problem = unitProblem(s, ctx);
      if (problem) {
        removed.push(problem);
        if (problem.startsWith('unknown offering')) inventedOffering = true;
      } else kept.push(s);
    }
    if (kept.length) outLines.push(prefix + kept.join(' '));
  }

  let answer = outLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  // A list heading left dangling after its items were removed reads badly; trim trailing colon lines.
  answer = answer.replace(/(?:^|\n)[^\n]*:\s*$/, (m) => (removed.length ? '' : m)).trim();
  if (!answer) answer = CONFIRMED_SENTENCE;
  return { answer, removed, inventedOffering };
}

// ---------------------------------------------------------------------------
// 4. Questions the server answers itself (never sent to the model)
// ---------------------------------------------------------------------------

// Explicit questions about policies that CareerBuddies has not confirmed. Deliberately narrow so that ordinary
// career questions ("I want a certification", "how soon can I get promoted") still go to the model.
const POLICY_QUESTION =
  /\b(guarantee[ds]?|refund(?:s|ed|able)?|money[- ]?back|certificates?|recordings?|satisfaction|rematch|response time|reply time|respond within|24\s*[/x]\s*7|hotline)\b/i;

export const isPolicyQuestion = (message: string) => POLICY_QUESTION.test(message);

export const POLICY_ANSWER = `${CONFIRMED_SENTENCE}\n\nIn the meantime I'm happy to help with your career goal. Tell me your current role and what you want to achieve.`;

// ---------------------------------------------------------------------------
// 5. Reply shape helpers
// ---------------------------------------------------------------------------

// A short reply that mainly asks the visitor a question (discovery). It gets no CTA button.
export function isDiscoveryReply(answer: string): boolean {
  const hasList = /^\s*(?:[-*]|\d+[.)])\s/m.test(answer);
  return /\?/.test(answer) && !hasList && answer.length < 450;
}

const PRICE_QUESTION = /\b(price|prices|pricing|cost|costs|how much|fee|fees|charge|charges|includes?|what is in)\b/i;

// The model sometimes forgets the hidden recommendation tag even though its advice names one offering. When the
// advice text (with pointers) names exactly ONE visible offering, that offering is used - never a guess between
// several, never for price / contents questions.
export function inferRecommendation(answer: string, latestUserMessage: string, offerings: Offering[]): Offering | null {
  if (PRICE_QUESTION.test(latestUserMessage)) return null;
  if (!/^\s*(?:[-*]|\d+[.)])\s/m.test(answer) && answer.length < 350) return null;
  const said = normalizeName(answer);
  const named = offerings.filter((o) => said.includes(normalizeName(o.name)));
  return named.length === 1 ? named[0] : null;
}

// ---------------------------------------------------------------------------
// 6. Webinar availability is a hard fact from the catalog: the server answers those questions itself
// ---------------------------------------------------------------------------

export interface LiveWebinar {
  title: string;
  date: string;
  time: string;
  price: string; // e.g. "₹199" or ''
}

// Short questions about whether / when a webinar or masterclass is available. (Longer career questions that merely
// mention a webinar still go to the model.)
const WEBINAR_TOPIC = /\b(webinars?|masterclass(?:es)?)\b/i;
const WEBINAR_AVAILABILITY = /\b(upcoming|next|any|live|scheduled|schedule|available|currently|register|registration|sign ?up|dates?|when|price|cost|open)\b/i;
export const isWebinarQuestion = (message: string) => message.length <= 160 && WEBINAR_TOPIC.test(message) && WEBINAR_AVAILABILITY.test(message);

export function webinarAnswer(webinars: LiveWebinar[]): string {
  if (!webinars.length) {
    return 'There are no live webinars scheduled right now. You can start with the free Career Check-in, or request free Career Counselling for personalised guidance.';
  }
  const lines = webinars.slice(0, 6).map((w) => `- **${w.title}**${[w.date, w.time].filter(Boolean).length ? ` — ${[w.date, w.time].filter(Boolean).join(', ')}` : ''}${w.price ? ` (${w.price})` : ''}`);
  return `These live webinars are currently listed:\n${lines.join('\n')}\n\nYou can register from the Webinars page, or an advisor can help you pick the right one.`;
}
