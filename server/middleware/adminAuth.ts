import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AdminUser } from '../models/AdminUser.ts';
import { verifyPassword } from './candidateAuth.ts';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Session tokens are signed with ADMIN_SESSION_SECRET - a separate random value - and
// NOT with the admin password: a token is public-ish data (it sits in the browser),
// so signing with the password would let anyone holding a token guess the password
// offline. Changing ADMIN_SESSION_SECRET invalidates every existing admin session.
const MIN_SESSION_SECRET_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `ADMIN_SESSION_SECRET is not configured (random value of at least ${MIN_SESSION_SECRET_LENGTH} characters required).`
    );
  }

  return secret;
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD is not configured. Add ADMIN_PASSWORD to your .env file.');
  }

  return password;
}

export type AdminActor = { name: string; source: 'owner' | 'team' };

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createAdminToken(actor: AdminActor = { name: 'Owner', source: 'owner' }): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const body = Buffer.from(JSON.stringify({
    name: String(actor.name || 'Owner').slice(0, 80),
    source: actor.source === 'team' ? 'team' : 'owner',
  })).toString('base64url');
  const payload = `${expiresAt}.${body}`;

  return {
    token: `${payload}.${signPayload(payload)}`,
    expiresAt,
  };
}

export function readAdminSession(token: string | undefined | null): (AdminActor & { expiresAt: number }) | null {
  if (!token) return null;

  try {
    getSecret();
  } catch {
    return null;
  }

  const parts = token.split('.');
  if (parts.length === 2) {
    const [expiresAtRaw, signature] = parts;
    const expiresAt = Number(expiresAtRaw);
    if (!expiresAtRaw || !signature || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
    if (!signaturesMatch(signPayload(String(expiresAt)), signature)) return null;
    return { name: 'Owner', source: 'owner', expiresAt };
  }

  if (parts.length !== 3) return null;
  const [expiresAtRaw, body, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAtRaw || !body || !signature || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  if (!signaturesMatch(signPayload(`${expiresAt}.${body}`), signature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { name?: string; source?: string };
    const name = String(parsed?.name || 'Owner').slice(0, 80);
    const source = parsed?.source === 'team' ? 'team' : 'owner';
    return { name, source, expiresAt };
  } catch {
    return null;
  }
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  return readAdminSession(token) !== null;
}

export function verifyAdminPassword(password: string | undefined | null): boolean {
  if (!password) return false;

  const expected = Buffer.from(getAdminPassword());
  const actual = Buffer.from(String(password));

  if (expected.length !== actual.length) return false;

  return crypto.timingSafeEqual(expected, actual);
}

export async function resolveAdminLogin(password: string | undefined | null): Promise<AdminActor | null> {
  if (!password) return null;

  try {
    const users = await AdminUser.find().select('+passwordHash').lean();
    for (const user of users) {
      if (user.passwordHash && verifyPassword(password, user.passwordHash)) {
        return { name: String(user.name || 'Team').slice(0, 80), source: 'team' };
      }
    }
  } catch {
    /* fall through to owner password */
  }

  try {
    if (verifyAdminPassword(password)) return { name: 'Owner', source: 'owner' };
  } catch {
    return null;
  }

  return null;
}

export async function verifyAdminPasswordAsync(password: string | undefined | null): Promise<boolean> {
  return (await resolveAdminLogin(password)) !== null;
}

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  const session = readAdminSession(token);

  if (!session) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Admin login required.',
    });
    return;
  }

  (req as any).adminActor = { name: session.name, source: session.source };
  next();
}
