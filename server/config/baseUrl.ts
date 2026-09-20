import type { Request } from 'express';

// ONE trusted source for the site's public origin, used for every security-sensitive
// URL the server generates (password-reset links, OAuth callback URLs, payment return
// URLs). It is never built from Host / X-Forwarded-Host request headers.
//
//   PUBLIC_BASE_URL  - canonical setting.
//   APP_URL          - legacy name, still honoured if PUBLIC_BASE_URL is not set.
//
// Outside production only, a request to localhost / 127.0.0.1 may use its own origin
// for local development. In production a missing/invalid value returns null and callers
// must fail safely instead of guessing.
function normalise(value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function getPublicBaseUrl(req?: Request): string | null {
  const configured = normalise(process.env.PUBLIC_BASE_URL) || normalise(process.env.APP_URL);
  if (configured) return configured;

  if (process.env.NODE_ENV !== 'production' && req) {
    const host = String(req.headers.host || '').toLowerCase();
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  }
  return null;
}
