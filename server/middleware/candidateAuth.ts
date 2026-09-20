import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Candidate } from '../models/Candidate.ts';

// Candidate sessions: stateless HMAC-signed tokens `id.expiresAt.tokenVersion.sig`.
// The signing key is separate from the admin token's (domain-separated), so an
// admin token can never be used as a candidate token or the other way round.
// Bumping Candidate.tokenVersion (logout / password change) revokes old tokens.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getKey(): string {
  const explicit = process.env.CANDIDATE_SESSION_SECRET;
  if (explicit) return explicit;

  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) {
    throw new Error('Set CANDIDATE_SESSION_SECRET (or ADMIN_PASSWORD) in your .env file.');
  }
  return crypto.createHmac('sha256', admin).update('careerbuddies-candidate-session-v1').digest('hex');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getKey()).update(`candidate:${payload}`).digest('hex');
}

export function createCandidateToken(id: string, tokenVersion: number) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${id}.${expiresAt}.${tokenVersion}`;
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

function parseToken(token: string | undefined) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [id, exp, ver, sig] = parts;
  const payload = `${id}.${exp}.${ver}`;

  const expected = Buffer.from(sign(payload), 'hex');
  const actual = Buffer.from(sig, 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return { id, tokenVersion: Number(ver) };
}

// Identifies the candidate from the Bearer token ONLY — never from a request
// body/query/param — and attaches the account to req.
export async function requireCandidateAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const parsed = parseToken(header.startsWith('Bearer ') ? header.slice(7) : undefined);

    if (parsed) {
      const candidate = await Candidate.findById(parsed.id).select('+tokenVersion');
      if (candidate && (candidate.tokenVersion ?? 0) === parsed.tokenVersion) {
        (req as any).candidate = candidate;
        next();
        return;
      }
    }
  } catch {
    // fall through to 401
  }

  res.status(401).json({ success: false, error: 'Please log in to continue.' });
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = (stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Signed, expiring blob (used for the OAuth state cookie).
export function signPayload(data: object, ttlMs: number): string {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + ttlMs })).toString('base64url');
  return `${body}.${sign(`payload:${body}`)}`;
}

export function readPayload<T = any>(value: string | undefined): T | null {
  if (!value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(`payload:${body}`), 'hex');
  const actual = Buffer.from(sig, 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && Date.now() <= data.exp ? (data as T) : null;
  } catch {
    return null;
  }
}
