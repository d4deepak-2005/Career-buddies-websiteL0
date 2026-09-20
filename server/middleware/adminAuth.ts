import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

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

function sign(expiresAt: number): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(String(expiresAt))
    .digest('hex');
}

export function createAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const signature = sign(expiresAt);

  return {
    token: `${expiresAt}.${signature}`,
    expiresAt,
  };
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;

  // Fail closed: if signing isn't configured, no token is valid.
  try {
    getSecret();
  } catch {
    return false;
  }

  const [expiresAtRaw, signature] = token.split('.');

  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expectedSignature = sign(expiresAt);

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function verifyAdminPassword(password: string | undefined | null): boolean {
  if (!password) return false;

  const expected = Buffer.from(getAdminPassword());
  const actual = Buffer.from(String(password));

  if (expected.length !== actual.length) return false;

  return crypto.timingSafeEqual(expected, actual);
}

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!verifyAdminToken(token)) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized. Admin login required.',
    });
    return;
  }

  next();
}
