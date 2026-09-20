import crypto from 'crypto';
import express, { Request, Response } from 'express';
import { Candidate } from '../models/Candidate.ts';
import { hashPassword, readPayload, signPayload, verifyPassword } from '../middleware/candidateAuth.ts';
import { buildSession } from './candidate.ts';
import { getPublicBaseUrl } from '../config/baseUrl.ts';

// Social sign-in (Google, LinkedIn, Microsoft, Facebook) via the OAuth 2.0
// authorization-code flow, done entirely on the server:
//   GET  /api/auth/:provider/start     -> redirect to the provider (state + PKCE + nonce)
//   GET  /api/auth/:provider/callback  -> verify state, exchange code, verify identity,
//                                         find/create the candidate, then redirect to the
//                                         site with a one-time code
//   POST /api/auth/exchange            -> the site swaps that code for the normal session token
// Client secrets never leave the server; the browser only ever sees redirects.
const router = express.Router();

type ProviderId = 'google' | 'linkedin' | 'microsoft' | 'facebook';

export class OAuthError extends Error {
  constructor(public code: string, message?: string) {
    super(message || code);
  }
}

// The provider identity matches an existing account by email, but the provider did not
// verify that email (Facebook never does). We must NOT merge silently — the person has to
// prove they own the existing account first (see the /link routes below).
export class LinkRequiredError extends OAuthError {
  constructor(
    public candidateId: string,
    public canUsePassword: boolean,
    public existingProviders: string[],
    public profile: SocialProfile
  ) {
    super('email_unverified_conflict');
  }
}

export interface SocialProfile {
  subject: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
}

const FB_VERSION = 'v21.0';
const MS_CONSUMER_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

function msTenant() {
  return process.env.MICROSOFT_TENANT || 'common';
}

interface ProviderConfig {
  label: string;
  clientId?: string;
  clientSecret?: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  pkce: boolean;
  nonce: boolean;
}

function getProvider(id: string): ProviderConfig | null {
  const env = process.env;
  switch (id) {
    case 'google':
      return {
        label: 'Google',
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'openid email profile',
        pkce: true,
        nonce: true,
      };
    case 'linkedin':
      return {
        label: 'LinkedIn',
        clientId: env.LINKEDIN_CLIENT_ID,
        clientSecret: env.LINKEDIN_CLIENT_SECRET,
        authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        scope: 'openid profile email',
        // Confidential web client: protected by state + client secret; identity is
        // read from LinkedIn's userinfo endpoint with the freshly issued access token.
        pkce: false,
        nonce: false,
      };
    case 'microsoft': {
      const t = msTenant();
      return {
        label: 'Microsoft',
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        authorizeUrl: `https://login.microsoftonline.com/${t}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${t}/oauth2/v2.0/token`,
        scope: 'openid profile email',
        pkce: true,
        nonce: true,
      };
    }
    case 'facebook':
      return {
        label: 'Facebook',
        clientId: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        authorizeUrl: `https://www.facebook.com/${FB_VERSION}/dialog/oauth`,
        tokenUrl: `https://graph.facebook.com/${FB_VERSION}/oauth/access_token`,
        scope: 'email,public_profile',
        pkce: false,
        nonce: false,
      };
    default:
      return null;
  }
}

// ---------- helpers ----------

const b64url = (buf: Buffer) => buf.toString('base64url');

// Callback URLs come only from the configured public base URL (never from request headers).
const baseUrl = (req: Request): string | null => getPublicBaseUrl(req);
const redirectUri = (req: Request, id: string) => `${baseUrl(req)}/api/auth/${id}/callback`;
const isHttps = (req: Request) => (baseUrl(req) || '').startsWith('https://');

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieName(id: string) {
  return `cb_oauth_${id}`;
}

function failRedirect(res: Response, provider: string, code: string) {
  res.redirect(`/?auth_error=${encodeURIComponent(code)}&auth_provider=${encodeURIComponent(provider)}`);
}

async function postForm(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(10000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new OAuthError('token_exchange_failed', data.error_description || data.error || String(res.status));
  return data;
}

// ---------- ID token verification (Google, Microsoft) ----------

const jwksCache = new Map<string, { keys: any[]; fetchedAt: number }>();

async function getJwks(uri: string, force = false): Promise<any[]> {
  const hit = jwksCache.get(uri);
  if (hit && !force && Date.now() - hit.fetchedAt < 60 * 60 * 1000) return hit.keys;
  const res = await fetch(uri, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new OAuthError('jwks_unavailable');
  const keys = ((await res.json()) as any).keys || [];
  jwksCache.set(uri, { keys, fetchedAt: Date.now() });
  return keys;
}

export interface VerifyOptions {
  jwksUri: string;
  audience: string;
  nonce: string;
  issuerOk: (claims: any) => boolean;
  // Test seam: supply keys directly instead of fetching them.
  keys?: any[];
}

// Verifies an RS256 OpenID Connect ID token: signature (provider JWKS), issuer,
// audience, expiry and nonce. Returns the claims.
export async function verifyIdToken(idToken: string, opts: VerifyOptions): Promise<any> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new OAuthError('invalid_id_token');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (header.alg !== 'RS256') throw new OAuthError('invalid_id_token', 'unsupported alg');

  const findKey = (keys: any[]) => keys.find((k) => k.kid === header.kid && (!k.use || k.use === 'sig'));
  let jwk = findKey(opts.keys ?? (await getJwks(opts.jwksUri)));
  if (!jwk && !opts.keys) jwk = findKey(await getJwks(opts.jwksUri, true)); // key rotation
  if (!jwk) throw new OAuthError('invalid_id_token', 'unknown signing key');

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, Buffer.from(parts[2], 'base64url'));
  if (!valid) throw new OAuthError('invalid_id_token', 'bad signature');

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(opts.audience)) throw new OAuthError('invalid_id_token', 'wrong audience');
  if (!opts.issuerOk(claims)) throw new OAuthError('invalid_id_token', 'wrong issuer');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now() - 60_000) throw new OAuthError('invalid_id_token', 'expired');
  if (!claims.nonce || claims.nonce !== opts.nonce) throw new OAuthError('invalid_id_token', 'nonce mismatch');
  return claims;
}

const splitName = (full: string) => {
  const [first, ...rest] = (full || '').trim().split(/\s+/);
  return { first: first || '', last: rest.join(' ') };
};

// ---------- per-provider identity ----------

async function fetchProfile(id: ProviderId, cfg: ProviderConfig, tokens: any, ctx: { nonce: string }): Promise<SocialProfile> {
  if (id === 'google') {
    if (!tokens.id_token) throw new OAuthError('invalid_id_token', 'no id_token');
    const c = await verifyIdToken(tokens.id_token, {
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      audience: cfg.clientId!,
      nonce: ctx.nonce,
      issuerOk: (x) => x.iss === 'https://accounts.google.com' || x.iss === 'accounts.google.com',
    });
    return {
      subject: String(c.sub),
      email: String(c.email || '').toLowerCase(),
      emailVerified: c.email_verified === true || c.email_verified === 'true',
      firstName: c.given_name || splitName(c.name).first,
      lastName: c.family_name || splitName(c.name).last,
    };
  }

  if (id === 'microsoft') {
    if (!tokens.id_token) throw new OAuthError('invalid_id_token', 'no id_token');
    const tenant = msTenant();
    const c = await verifyIdToken(tokens.id_token, {
      jwksUri: `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`,
      audience: cfg.clientId!,
      nonce: ctx.nonce,
      issuerOk: (x) =>
        x.iss === `https://login.microsoftonline.com/${x.tid}/v2.0` &&
        (['common', 'organizations', 'consumers'].includes(tenant) || x.tid === tenant),
    });
    const consumer = c.tid === MS_CONSUMER_TENANT;
    const email = String(c.email || (consumer ? c.preferred_username : '') || '').toLowerCase();
    // Microsoft does not guarantee `email` is verified for work/school accounts, so it
    // only counts as verified for personal accounts or when Microsoft says so (xms_edov).
    const verified = !!email && (consumer || c.xms_edov === true || c.xms_edov === 'true' || c.xms_edov === 1);
    const n = splitName(c.name);
    return { subject: String(c.sub), email, emailVerified: verified, firstName: c.given_name || n.first, lastName: c.family_name || n.last };
  }

  if (id === 'linkedin') {
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
    const c: any = await res.json().catch(() => ({}));
    if (!res.ok || !c.sub) throw new OAuthError('profile_failed');
    const n = splitName(c.name);
    return {
      subject: String(c.sub),
      email: String(c.email || '').toLowerCase(),
      emailVerified: c.email_verified === true || c.email_verified === 'true',
      firstName: c.given_name || n.first,
      lastName: c.family_name || n.last,
    };
  }

  // facebook
  const proof = crypto.createHmac('sha256', cfg.clientSecret!).update(tokens.access_token).digest('hex');
  const url = `https://graph.facebook.com/${FB_VERSION}/me?fields=id,name,first_name,last_name,email&access_token=${encodeURIComponent(tokens.access_token)}&appsecret_proof=${proof}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const c: any = await res.json().catch(() => ({}));
  if (!res.ok || !c.id) throw new OAuthError('profile_failed');
  const n = splitName(c.name);
  return {
    subject: String(c.id),
    email: String(c.email || '').toLowerCase(),
    // Meta does not expose an "email verified" signal, so it is never trusted for linking.
    emailVerified: false,
    firstName: c.first_name || n.first,
    lastName: c.last_name || n.last,
  };
}

// ---------- account resolution (create / find / link) ----------

export async function resolveSocialLogin(provider: string, profile: SocialProfile): Promise<{ candidateId: string; notice?: string }> {
  // 1. Already linked → that account.
  const linked = await Candidate.findOne({ identities: { $elemMatch: { provider, subject: profile.subject } } });
  if (linked) return { candidateId: linked._id.toString() };

  if (!profile.email) throw new OAuthError('no_email');

  const existing = await Candidate.findOne({ email: profile.email }).select('+passwordHash +tokenVersion');

  if (existing) {
    // Never attach a login to an account on the strength of an email the provider hasn't verified.
    if (!profile.emailVerified) {
      throw new LinkRequiredError(
        existing._id.toString(),
        existing.hasPassword !== false,
        (existing.identities || []).map((i: any) => i.provider),
        profile
      );
    }

    existing.identities.push({ provider, subject: profile.subject });
    let notice: string | undefined;
    if (!existing.emailVerified) {
      // The account was made with an unverified email + password, so whoever set that
      // password may not own the address (pre-registration takeover). The provider has
      // now proven ownership: keep the account, invalidate the old password and sessions.
      existing.passwordHash = hashPassword(crypto.randomBytes(32).toString('hex'));
      existing.tokenVersion = (existing.tokenVersion ?? 0) + 1;
      existing.emailVerified = true;
      existing.hasPassword = false;
      notice = 'linked_password_cleared';
    }
    await existing.save();
    return { candidateId: existing._id.toString(), notice };
  }

  // 2. New user.
  const created = await Candidate.create({
    email: profile.email,
    // Social-only accounts get an unguessable password nobody knows.
    passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
    emailVerified: profile.emailVerified,
    hasPassword: false,
    identities: [{ provider, subject: profile.subject }],
    firstName: profile.firstName || profile.email.split('@')[0],
    lastName: profile.lastName || '',
  });
  return { candidateId: created._id.toString() };
}

// ---------- routes ----------

const pending = new Map<string, { candidateId: string; notice?: string; exp: number }>();
function sweep() {
  const now = Date.now();
  for (const [k, v] of pending) if (v.exp < now) pending.delete(k);
}

// ---- Account-link confirmation (unverified provider email matches an existing account) ----
interface PendingLink {
  provider: string;
  subject: string;
  email: string;
  candidateId: string;
  canUsePassword: boolean;
  existingProviders: string[];
  attempts: number;
  exp: number;
}
const pendingLinks = new Map<string, PendingLink>();
const LINK_TTL_MS = 10 * 60 * 1000;
const MAX_LINK_PASSWORD_ATTEMPTS = 5;

function sweepLinks() {
  const now = Date.now();
  for (const [k, v] of pendingLinks) if (v.exp < now) pendingLinks.delete(k);
}

function getPendingLink(code: unknown): PendingLink | null {
  if (typeof code !== 'string') return null;
  const pl = pendingLinks.get(code);
  if (!pl || pl.exp < Date.now()) {
    pendingLinks.delete(code);
    return null;
  }
  return pl;
}

// Adds the waiting provider identity to the (already-proven) account.
async function attachPendingIdentity(pl: PendingLink): Promise<void> {
  const owner = await Candidate.findOne({ identities: { $elemMatch: { provider: pl.provider, subject: pl.subject } } }).select('_id');
  if (owner && owner._id.toString() !== pl.candidateId) throw new OAuthError('identity_conflict');
  if (!owner) {
    await Candidate.updateOne(
      { _id: pl.candidateId },
      { $push: { identities: { provider: pl.provider, subject: pl.subject } } }
    );
  }
}

router.get('/:provider/start', (req: Request, res: Response) => {
  const id = req.params.provider;
  const cfg = getProvider(id);
  if (!cfg) return void res.status(404).json({ success: false, error: 'Unknown provider.' });

  if (!cfg.clientId || !cfg.clientSecret || !baseUrl(req)) {
    if (!baseUrl(req)) console.error('[OAuth] PUBLIC_BASE_URL is not configured; sign-in is unavailable.');
    return failRedirect(res, id, 'not_configured');
  }

  const state = b64url(crypto.randomBytes(24));
  const nonce = b64url(crypto.randomBytes(24));
  const verifier = b64url(crypto.randomBytes(48));

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(req, id),
    response_type: 'code',
    scope: cfg.scope,
    state,
  });
  if (cfg.nonce) params.set('nonce', nonce);
  if (cfg.pkce) {
    params.set('code_challenge', b64url(crypto.createHash('sha256').update(verifier).digest()));
    params.set('code_challenge_method', 'S256');
  }
  if (id === 'google') params.set('prompt', 'select_account');
  if (id === 'microsoft') {
    params.set('response_mode', 'query');
    params.set('prompt', 'select_account');
  }

  // Signed, short-lived, httpOnly cookie ties the callback to THIS browser (CSRF / login fixation).
  // Optional: this sign-in is proving ownership of an account so a waiting link can complete.
  const linkCode = typeof req.query.link === 'string' && getPendingLink(req.query.link) ? req.query.link : undefined;
  const cookie = signPayload({ p: id, s: state, n: nonce, v: verifier, l: linkCode }, 10 * 60 * 1000);
  res.setHeader(
    'Set-Cookie',
    `${cookieName(id)}=${encodeURIComponent(cookie)}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${isHttps(req) ? '; Secure' : ''}`
  );
  res.redirect(`${cfg.authorizeUrl}?${params.toString()}`);
});

router.get('/:provider/callback', async (req: Request, res: Response) => {
  const id = req.params.provider;
  const cfg = getProvider(id);
  if (!cfg) return void res.status(404).end();

  // Single-use: clear the state cookie whatever happens next.
  const stored = readPayload<{ p: string; s: string; n: string; v: string; l?: string }>(parseCookies(req.headers.cookie)[cookieName(id)]);
  res.setHeader('Set-Cookie', `${cookieName(id)}=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0`);

  try {
    // User pressed cancel / provider denied.
    if (req.query.error) {
      return failRedirect(res, id, req.query.error === 'access_denied' || req.query.error === 'user_cancelled_login' || req.query.error === 'user_cancelled_authorize' ? 'cancelled' : 'provider_error');
    }
    if (!cfg.clientId || !cfg.clientSecret || !baseUrl(req)) return failRedirect(res, id, 'not_configured');

    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!stored || stored.p !== id || !state || !code) return failRedirect(res, id, 'invalid_state');
    const a = Buffer.from(state);
    const b = Buffer.from(stored.s);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return failRedirect(res, id, 'invalid_state');

    const form: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(req, id),
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    };
    if (cfg.pkce) form.code_verifier = stored.v;

    let tokens: any;
    if (id === 'facebook') {
      // Facebook's token endpoint takes a GET.
      const q = new URLSearchParams(form).toString();
      const r = await fetch(`${cfg.tokenUrl}?${q}`, { signal: AbortSignal.timeout(10000) });
      tokens = await r.json().catch(() => ({}));
      if (!r.ok || !tokens.access_token) throw new OAuthError('token_exchange_failed');
    } else {
      tokens = await postForm(cfg.tokenUrl, form);
    }

    const profile = await fetchProfile(id as ProviderId, cfg, tokens, { nonce: stored.n });
    let candidateId: string;
    let notice: string | undefined;

    if (stored.l) {
      // This sign-in exists only to confirm ownership for a waiting link. Never create accounts here.
      const pl = getPendingLink(stored.l);
      if (!pl) return failRedirect(res, id, 'link_expired');
      const me = await Candidate.findOne({ identities: { $elemMatch: { provider: id, subject: profile.subject } } }).select('_id');
      if (!me || me._id.toString() !== pl.candidateId) return failRedirect(res, id, 'link_mismatch');
      await attachPendingIdentity(pl);
      pendingLinks.delete(stored.l);
      candidateId = pl.candidateId;
    } else {
      ({ candidateId, notice } = await resolveSocialLogin(id, profile));
    }

    sweep();
    const oneTime = b64url(crypto.randomBytes(32));
    pending.set(oneTime, { candidateId, notice, exp: Date.now() + 60_000 });
    res.redirect(`/#social=${oneTime}`);
  } catch (error: any) {
    if (error instanceof LinkRequiredError && (error.canUsePassword || error.existingProviders.length)) {
      // Offer a proof-of-ownership step instead of a dead end. Nothing is linked yet.
      sweepLinks();
      const linkCode = b64url(crypto.randomBytes(32));
      pendingLinks.set(linkCode, {
        provider: id,
        subject: error.profile.subject,
        email: error.profile.email,
        candidateId: error.candidateId,
        canUsePassword: error.canUsePassword,
        existingProviders: error.existingProviders,
        attempts: 0,
        exp: Date.now() + LINK_TTL_MS,
      });
      return void res.redirect(`/#link=${linkCode}`);
    }
    const code = error instanceof OAuthError ? error.code : 'server_error';
    console.error(`[OAuth:${id}] ${code}${error?.message && error.message !== code ? ` - ${error.message}` : ''}`);
    failRedirect(res, id, code);
  }
});

// What the "confirm it's you" dialog needs to show. Never reveals tokens or other accounts.
router.post('/link/info', express.json(), (req: Request, res: Response) => {
  const pl = getPendingLink(req.body?.code);
  if (!pl) return void res.json({ success: true, valid: false });
  const labels: Record<string, string> = { google: 'Google', linkedin: 'LinkedIn', microsoft: 'Microsoft', facebook: 'Facebook' };
  res.json({
    success: true,
    valid: true,
    provider: labels[pl.provider] || pl.provider,
    email: pl.email,
    canUsePassword: pl.canUsePassword,
    // Only providers that are configured here and already linked to that account.
    confirmWith: pl.existingProviders
      .filter((p) => p !== pl.provider && !!getProvider(p)?.clientId && !!getProvider(p)?.clientSecret)
      .map((p) => ({ id: p, label: labels[p] || p })),
  });
});

// Confirm ownership with the CareerBuddies password, then link the provider and sign in.
router.post('/link', express.json(), async (req: Request, res: Response) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const pl = getPendingLink(code);
  if (!pl) return void res.status(400).json({ success: false, error: 'This link request has expired. Please sign in with Facebook again.' });
  if (!pl.canUsePassword) return void res.status(400).json({ success: false, error: 'Please confirm with the sign-in method you used to create your account.' });

  pl.attempts += 1;
  if (pl.attempts > MAX_LINK_PASSWORD_ATTEMPTS) {
    pendingLinks.delete(code);
    return void res.status(429).json({ success: false, error: 'Too many attempts. Please start again.' });
  }

  const owner = await Candidate.findById(pl.candidateId).select('+passwordHash');
  if (!owner || !password || !verifyPassword(password, owner.passwordHash)) {
    return void res.status(401).json({ success: false, error: 'Incorrect password.' });
  }

  try {
    await attachPendingIdentity(pl);
  } catch {
    return void res.status(409).json({ success: false, error: 'This account could not be linked. Please contact support.' });
  }
  pendingLinks.delete(code);
  res.json(await buildSession(pl.candidateId));
});

// The site trades the one-time code (from the URL fragment) for a normal session.
router.post('/exchange', express.json(), async (req: Request, res: Response) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const entry = pending.get(code);
  pending.delete(code); // single use
  if (!entry || entry.exp < Date.now()) {
    return void res.status(400).json({ success: false, error: 'This sign-in link has expired. Please try again.' });
  }
  const session = await buildSession(entry.candidateId);
  res.json({ ...session, notice: entry.notice });
});

// Which providers are configured (booleans only — never any credentials).
router.get('/providers', (_req: Request, res: Response) => {
  const out: Record<string, boolean> = {};
  for (const id of ['google', 'linkedin', 'microsoft', 'facebook']) {
    const c = getProvider(id)!;
    out[id] = !!(c.clientId && c.clientSecret);
  }
  res.json({ success: true, providers: out });
});

export default router;
