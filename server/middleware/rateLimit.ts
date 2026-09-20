import { Request, Response, NextFunction } from 'express';

// Small in-memory rate limiter (fixed window). One instance = one independent
// bucket, so login, signup, leads, AI etc. never share a counter. Keys come from
// req.ip, which is the real client address once Express `trust proxy` is set to
// the correct number of proxy hops (see server.ts) - never from raw headers.
//
// NOTE: state lives in this process. That is fine for a single instance; if the
// app is ever scaled to several instances, move this to a shared store.
interface Entry {
  count: number;
  resetAt: number;
}

export interface Limiter {
  // Express middleware: counts every request.
  middleware: (req: Request, res: Response, next: NextFunction) => void;
  // Failure-counting style (used for logins): check first, record failures, clear on success.
  isBlocked: (key: string) => boolean;
  fail: (key: string) => void;
  reset: (key: string) => void;
  retryAfterSeconds: (key: string) => number;
}

const MAX_KEYS = 20000; // hard cap so an attacker can't grow the map without bound

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  message: string;
  keyFn?: (req: Request) => string;
}): Limiter {
  const store = new Map<string, Entry>();

  const sweep = () => {
    const now = Date.now();
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  };
  setInterval(sweep, 60_000).unref();

  const current = (key: string): Entry | undefined => {
    const e = store.get(key);
    if (e && e.resetAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return e;
  };

  const bump = (key: string): Entry => {
    let e = current(key);
    if (!e) {
      if (store.size >= MAX_KEYS) sweep();
      e = { count: 0, resetAt: Date.now() + opts.windowMs };
      if (store.size < MAX_KEYS) store.set(key, e);
    }
    e.count += 1;
    return e;
  };

  const retryAfterSeconds = (key: string) => {
    const e = current(key);
    return e ? Math.max(1, Math.ceil((e.resetAt - Date.now()) / 1000)) : 1;
  };

  const reject = (res: Response, key: string) => {
    const wait = retryAfterSeconds(key);
    res.setHeader('Retry-After', String(wait));
    res.status(429).json({ success: false, error: opts.message, retryAfterSeconds: wait });
  };

  return {
    middleware(req, res, next) {
      const key = opts.keyFn ? opts.keyFn(req) : req.ip || 'unknown';
      const e = bump(key);
      if (e.count > opts.max) return reject(res, key);
      next();
    },
    isBlocked: (key) => (current(key)?.count ?? 0) >= opts.max,
    fail: (key) => void bump(key),
    reset: (key) => void store.delete(key),
    retryAfterSeconds,
  };
}
