import crypto from 'crypto';
import express, { Request, Response } from 'express';
import { Candidate } from '../models/Candidate.ts';
import { Lead } from '../models/Lead.ts';
import { Payment } from '../models/Payment.ts';
import { Webinar } from '../models/Webinar.ts';
import { passwordResetEmail, sendMail, socialOnlyEmail } from '../services/mailer.ts';
import { getPublicBaseUrl } from '../config/baseUrl.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';
import {
  createCandidateToken,
  hashPassword,
  requireCandidateAuth,
  verifyPassword,
} from '../middleware/candidateAuth.ts';

// Candidate accounts + the Candidate Area's data. Every route derives the user
// from the session token (requireCandidateAuth) — no user id is ever accepted
// from the browser.
const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Independent rate-limit buckets: a burst of failed logins can never lock out signup,
// forgot-password or normal API use (and vice versa). Keys are the real client address
// (Express `trust proxy`) or the account email.
const signupLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many sign-up attempts. Please try again later.' });
const loginIpLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many failed login attempts. Please try again in a few minutes.' });
const loginEmailLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8, message: 'Too many failed login attempts. Please try again in a few minutes.' });
const enquiryLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'You have sent several enquiries recently. Please wait a few minutes before sending another.',
  keyFn: (req) => String((req as any).candidate?._id || req.ip || 'unknown'),
});

// Profile fields the Candidate Area edits (email/password are handled separately).
const PROFILE_FIELDS = [
  'firstName', 'lastName', 'mobile', 'alternateNumber', 'alternateEmail',
  'currentDesignation', 'totalExperience', 'targetRole', 'linkedinUrl', 'portfolioUrl', 'bio',
] as const;

function publicCandidate(c: any) {
  return {
    id: c._id.toString(),
    email: c.email,
    accountType: c.accountType,
    firstName: c.firstName,
    lastName: c.lastName,
    mobile: c.mobile,
    alternateNumber: c.alternateNumber,
    alternateEmail: c.alternateEmail,
    currentDesignation: c.currentDesignation,
    totalExperience: c.totalExperience,
    targetRole: c.targetRole,
    linkedinUrl: c.linkedinUrl,
    portfolioUrl: c.portfolioUrl,
    bio: c.bio,
    joinedAt: c.createdAt,
  };
}

export async function buildSession(candidateId: string) {
  const c = await Candidate.findById(candidateId).select('+tokenVersion');
  const { token, expiresAt } = createCandidateToken(candidateId, c.tokenVersion ?? 0);
  return { success: true, token, expiresAt, candidate: publicCandidate(c) };
}

async function issueSession(res: Response, candidateId: string, status = 200) {
  res.status(status).json(await buildSession(candidateId));
}

router.post('/signup', signupLimiter.middleware, async (req: Request, res: Response) => {
  try {
    const name = str(req.body?.name, 120);
    const email = str(req.body?.email, 200).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const accountType = req.body?.accountType === 'mentor' ? 'mentor' : 'mentee';

    if (!name) return void res.status(400).json({ success: false, error: 'Please enter your full name.' });
    if (!EMAIL_RE.test(email)) return void res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    const passwordIssue = passwordProblem(password, email);
    if (passwordIssue) {
      return void res.status(400).json({ success: false, error: passwordIssue });
    }
    if (await Candidate.exists({ email })) {
      return void res.status(409).json({ success: false, error: 'An account with this email already exists. Please log in.' });
    }

    const [firstName, ...rest] = name.split(/\s+/);
    const created = await Candidate.create({
      email,
      passwordHash: hashPassword(password),
      accountType,
      firstName,
      lastName: rest.join(' '),
    });
    await issueSession(res, created._id.toString(), 201);
  } catch (error: any) {
    if (error?.code === 11000) {
      return void res.status(409).json({ success: false, error: 'An account with this email already exists. Please log in.' });
    }
    console.error('[Candidate] Signup failed:', error?.message || error);
    res.status(500).json({ success: false, error: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const ipKey = req.ip || 'unknown';
  const email = str(req.body?.email, 200).toLowerCase();
  const emailKey = email || '(none)';

  // Only FAILED attempts count. Checked before the password is even looked at.
  if (loginIpLimiter.isBlocked(ipKey) || loginEmailLimiter.isBlocked(emailKey)) {
    const wait = Math.max(loginIpLimiter.retryAfterSeconds(ipKey), loginEmailLimiter.retryAfterSeconds(emailKey));
    res.setHeader('Retry-After', String(wait));
    return void res.status(429).json({
      success: false,
      error: 'Too many failed login attempts. Please try again in a few minutes.',
      retryAfterSeconds: wait,
    });
  }

  try {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const candidate = await Candidate.findOne({ email }).select('+passwordHash');
    if (!candidate || !verifyPassword(password, candidate.passwordHash)) {
      loginIpLimiter.fail(ipKey);
      loginEmailLimiter.fail(emailKey);
      return void res.status(401).json({ success: false, error: 'Incorrect email or password.' });
    }
    loginEmailLimiter.reset(emailKey);
    await issueSession(res, candidate._id.toString());
  } catch (error: any) {
    console.error('[Candidate] Login failed:', error?.message || error);
    res.status(500).json({ success: false, error: 'Could not log you in. Please try again.' });
  }
});

router.get('/me', requireCandidateAuth, (req: Request, res: Response) => {
  res.json({ success: true, candidate: publicCandidate((req as any).candidate) });
});

router.put('/me', requireCandidateAuth, async (req: Request, res: Response) => {
  const candidate = (req as any).candidate;
  const body = req.body || {};

  for (const field of PROFILE_FIELDS) {
    if (typeof body[field] === 'string') {
      candidate[field] = str(body[field], field === 'bio' ? 2000 : 300);
    }
  }
  if (!candidate.firstName) {
    return void res.status(400).json({ success: false, error: 'First name is required.' });
  }
  if (candidate.alternateEmail && !EMAIL_RE.test(candidate.alternateEmail)) {
    return void res.status(400).json({ success: false, error: 'Alternate email is not valid.' });
  }

  await candidate.save();
  res.json({ success: true, candidate: publicCandidate(candidate) });
});

// Server-side logout: invalidates every token issued so far for this account.
router.post('/logout', requireCandidateAuth, async (req: Request, res: Response) => {
  await Candidate.updateOne({ _id: (req as any).candidate._id }, { $inc: { tokenVersion: 1 } });
  res.json({ success: true });
});

router.post('/change-password', requireCandidateAuth, async (req: Request, res: Response) => {
  const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  const candidate = await Candidate.findById((req as any).candidate._id).select('+passwordHash +tokenVersion');
  if (!candidate || !verifyPassword(current, candidate.passwordHash)) {
    return void res.status(400).json({ success: false, error: 'Current password is incorrect.' });
  }
  const passwordIssue = passwordProblem(next, candidate.email);
  if (passwordIssue) {
    return void res.status(400).json({ success: false, error: passwordIssue });
  }

  candidate.passwordHash = hashPassword(next);
  candidate.tokenVersion = (candidate.tokenVersion ?? 0) + 1;
  await candidate.save();
  // Other sessions are now revoked; hand this browser a fresh token.
  await issueSession(res, candidate._id.toString());
});

// ---------------------------------------------------------------------------
// Forgot / reset password (email + password accounts)
// ---------------------------------------------------------------------------
const RESET_TTL_MINUTES = 30;
const RESET_COOLDOWN_MS = 60 * 1000;
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// The reset link points at our own site. It is NEVER built from request headers
// (Host / X-Forwarded-Host are attacker-controlled: password-reset poisoning).
// Uses the shared trusted base URL (PUBLIC_BASE_URL); only local development falls back to localhost.
function trustedBaseUrl(req: Request): string | null {
  return getPublicBaseUrl(req);
}

function passwordProblem(password: string, email?: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 200) return 'Password is too long.';
  if (/^(.)\1+$/.test(password)) return 'Please choose a less predictable password.';
  if (email && password.toLowerCase() === email.toLowerCase()) return 'Password cannot be the same as your email.';
  return null;
}

const resetAttempts = new Map<string, { count: number; reset: number }>();
function resetRateLimited(req: Request, res: Response, max: number): boolean {
  const key = `${req.path}|${req.ip || 'unknown'}`;
  const now = Date.now();
  const e = resetAttempts.get(key);
  if (!e || now > e.reset) {
    resetAttempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return false;
  }
  e.count += 1;
  if (e.count > max) {
    res.status(429).json({ success: false, error: 'Too many attempts. Please try again in a few minutes.' });
    return true;
  }
  return false;
}

router.post('/forgot-password', async (req: Request, res: Response) => {
  if (resetRateLimited(req, res, 10)) return;

  const email = str(req.body?.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return void res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
  }

  // Same answer whether or not the account exists; the work happens after replying
  // so response time doesn't reveal it either.
  res.json({
    success: true,
    message: 'If an account exists for that email, we have sent instructions to reset your password.',
  });

  const baseUrl = trustedBaseUrl(req);
  try {
    const candidate = await Candidate.findOne({ email }).select('+resetRequestedAt');
    if (!candidate) return;
    if (!baseUrl) {
      console.warn('[PasswordReset] No trusted site URL (set PUBLIC_BASE_URL); email not sent.');
      return;
    }

    if (candidate.hasPassword === false) {
      // Social-only account: no password to reset. Tell the owner (by email) how to sign in.
      const labels: Record<string, string> = { google: 'Google', linkedin: 'LinkedIn', microsoft: 'Microsoft', facebook: 'Facebook' };
      const providers = (candidate.identities || []).map((i: any) => labels[i.provider] || i.provider);
      await sendMail({ to: candidate.email, ...socialOnlyEmail(baseUrl, providers) });
      return;
    }

    if (candidate.resetRequestedAt && Date.now() - candidate.resetRequestedAt.getTime() < RESET_COOLDOWN_MS) return;

    const token = crypto.randomBytes(32).toString('base64url');
    candidate.resetTokenHash = hashToken(token); // only the hash is stored
    candidate.resetTokenExpires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    candidate.resetRequestedAt = new Date();
    await candidate.save();

    const link = `${baseUrl}/reset-password?token=${token}`;
    await sendMail({ to: candidate.email, ...passwordResetEmail(baseUrl, link, RESET_TTL_MINUTES) });
  } catch (error: any) {
    console.error('[PasswordReset] Could not process request:', error?.message || error);
  }
});

async function findByResetToken(token: unknown) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  return Candidate.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires +tokenVersion');
}

router.post('/reset-password/check', async (req: Request, res: Response) => {
  if (resetRateLimited(req, res, 30)) return;
  res.json({ success: true, valid: !!(await findByResetToken(req.body?.token)) });
});

router.post('/reset-password', async (req: Request, res: Response) => {
  if (resetRateLimited(req, res, 15)) return;
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const candidate = await findByResetToken(req.body?.token);
  if (!candidate) {
    return void res.status(400).json({ success: false, error: 'This reset link is invalid or has expired. Please request a new one.' });
  }
  const problem = passwordProblem(password, candidate.email);
  if (problem) return void res.status(400).json({ success: false, error: problem });

  candidate.passwordHash = hashPassword(password);
  candidate.hasPassword = true;
  candidate.emailVerified = true; // they just proved they own the mailbox
  candidate.tokenVersion = (candidate.tokenVersion ?? 0) + 1; // sign out every existing session
  candidate.resetTokenHash = undefined; // single use
  candidate.resetTokenExpires = undefined;
  await candidate.save();

  res.json({ success: true, message: 'Your password has been reset successfully.' });
});

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'Under Review',
  contacted: 'In Progress',
  scheduled: 'Scheduled',
  converted: 'Resolved',
};

// Everything the tabs need, scoped to the logged-in candidate's own email.
router.get('/dashboard', requireCandidateAuth, async (req: Request, res: Response) => {
  const me = (req as any).candidate;
  const email: string = me.email;

  // Payments belong to the account that created the checkout (server-side session),
  // never to whoever typed a matching email. Enquiries: the ones this account sent
  // while logged in, plus leads under its email ONLY if that email is verified
  // (password sign-ups are not verified, so a stranger can't read someone else's lead).
  const enquiryFilter: any = me.emailVerified
    ? { $or: [{ candidateId: me._id }, { email }] }
    : { candidateId: me._id };

  const [payments, leads] = await Promise.all([
    Payment.find({ candidateId: me._id }).sort({ createdAt: -1 }).lean(),
    Lead.find(enquiryFilter).sort({ createdAt: -1 }).lean(),
  ]);

  // Webinars the candidate has actually paid for, joined to the CMS webinar
  // (schedule / link) when it can be found.
  const paidWebinars = payments.filter((p: any) => p.itemType === 'webinar' && p.status === 'succeeded');
  const webinarIds = paidWebinars
    .map((p: any) => p.itemId)
    .filter((id: string) => /^[a-f0-9]{24}$/i.test(id || ''));
  const webinarDocs = webinarIds.length ? await Webinar.find({ _id: { $in: webinarIds } }).lean() : [];
  const webinarById = new Map(webinarDocs.map((w: any) => [w._id.toString(), w]));

  // Dodo reports the total in the currency's minor unit (paise).
  const rupees = (p: any) => (typeof p.amount === 'number' ? p.amount / 100 : null);

  res.json({
    success: true,
    payments: payments.map((p: any) => ({
      id: p.orderRef,
      itemType: p.itemType,
      itemName: p.itemName,
      status: p.status,
      amount: rupees(p),
      currency: p.currency || 'INR',
      createdAt: p.createdAt,
    })),
    enquiries: leads.map((l: any) => ({
      id: l._id.toString(),
      createdAt: l.createdAt,
      subject: l.requirement,
      category: l.planInterest,
      status: LEAD_STATUS_LABEL[l.status] || 'Under Review',
      resolved: l.status === 'converted',
      // Internal admin notes are deliberately never sent to candidates.
    })),
    webinars: paidWebinars.map((p: any) => {
      const w: any = webinarById.get(p.itemId);
      return {
        id: p.orderRef,
        title: w?.title || p.itemName,
        speaker: w ? [w.speakerName, w.speakerDesignation].filter(Boolean).join(' — ') : '',
        date: w?.date || '',
        time: w?.time || '',
        description: w?.description || '',
        link: w?.registrationLink || '',
        amount: rupees(p),
      };
    }),
  });
});

// New enquiry from the Candidate Area → stored as a lead so the admin sees it in
// the existing Leads dashboard, and it appears in this candidate's own history.
router.post('/enquiries', requireCandidateAuth, enquiryLimiter.middleware, async (req: Request, res: Response) => {
  const c = (req as any).candidate;
  const subject = str(req.body?.subject, 200);
  const category = str(req.body?.category, 100) || 'General';
  const message = str(req.body?.message, 2000);

  if (!subject || !message) {
    return void res.status(400).json({ success: false, error: 'Subject and message are required.' });
  }

  const lead = await Lead.create({
    firstName: c.firstName,
    lastName: c.lastName || '',
    mobile: c.mobile || 'Not provided',
    email: c.email,
    candidateId: c._id,
    currentRole: c.currentDesignation || 'Professional',
    experience: c.totalExperience || 'Not specified',
    requirement: `${subject} — ${message}`,
    planInterest: category,
    source: 'Candidate Dashboard Enquiry',
  });

  res.status(201).json({
    success: true,
    enquiry: {
      id: lead._id.toString(),
      createdAt: lead.createdAt,
      subject: lead.requirement,
      category: lead.planInterest,
      status: LEAD_STATUS_LABEL.new,
      resolved: false,
    },
  });
});

export default router;
