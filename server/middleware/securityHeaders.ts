import { Request, Response, NextFunction } from 'express';

// Baseline browser-side hardening. Kept deliberately compatible with what the
// site actually loads: same-origin scripts/API calls, Google Fonts, and images
// from the site itself, data/blob URLs and https hosts (CMS photo URLs).
// Sign-in/checkout redirects are top-level navigations and are not affected.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(isProduction: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // The Vite dev server injects inline scripts, so the CSP is production-only.
    if (isProduction) res.setHeader('Content-Security-Policy', CSP);

    // Only over HTTPS (req.secure honours X-Forwarded-Proto via `trust proxy`).
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');

    next();
  };
}
