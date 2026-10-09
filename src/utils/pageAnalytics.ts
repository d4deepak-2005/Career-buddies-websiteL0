const VID_KEY = 'cb_vid';
const SKIP = new Set(['admin', 'dashboard', 'leads-dashboard']);

function visitorId(): string {
  try {
    const existing = localStorage.getItem(VID_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(VID_KEY, next);
    return next;
  } catch {
    return '';
  }
}

let lastPage = '';
let lastAt = 0;

export function trackPublicPageView(page: string) {
  if (!page || SKIP.has(page)) return;
  const now = Date.now();
  if (page === lastPage && now - lastAt < 4000) return;
  lastPage = page;
  lastAt = now;
  fetch('/api/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page,
      vid: visitorId(),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    }),
    keepalive: true,
  }).catch(() => undefined);
}
