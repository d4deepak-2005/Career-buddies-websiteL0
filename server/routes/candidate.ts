import express, { Request, Response } from 'express';
import { Candidate } from '../models/Candidate.ts';
import { Lead } from '../models/Lead.ts';
import { Payment } from '../models/Payment.ts';
import { Webinar } from '../models/Webinar.ts';
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

// Small in-memory brute-force guard for login/signup (per IP).
const attempts = new Map<string, { count: number; reset: number }>();
function rateLimited(req: Request, res: Response): boolean {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.reset) {
    attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  if (entry.count > 20) {
    res.status(429).json({ success: false, error: 'Too many attempts. Please try again in a few minutes.' });
    return true;
  }
  return false;
}

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

async function issueSession(res: Response, candidateId: string, status = 200) {
  const c = await Candidate.findById(candidateId).select('+tokenVersion');
  const { token, expiresAt } = createCandidateToken(candidateId, c.tokenVersion ?? 0);
  res.status(status).json({ success: true, token, expiresAt, candidate: publicCandidate(c) });
}

router.post('/signup', async (req: Request, res: Response) => {
  if (rateLimited(req, res)) return;
  try {
    const name = str(req.body?.name, 120);
    const email = str(req.body?.email, 200).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const accountType = req.body?.accountType === 'mentor' ? 'mentor' : 'mentee';

    if (!name) return void res.status(400).json({ success: false, error: 'Please enter your full name.' });
    if (!EMAIL_RE.test(email)) return void res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    if (password.length < 8 || password.length > 200) {
      return void res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
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
  if (rateLimited(req, res)) return;
  try {
    const email = str(req.body?.email, 200).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const candidate = await Candidate.findOne({ email }).select('+passwordHash');
    if (!candidate || !verifyPassword(password, candidate.passwordHash)) {
      return void res.status(401).json({ success: false, error: 'Incorrect email or password.' });
    }
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
  if (next.length < 8 || next.length > 200) {
    return void res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
  }

  candidate.passwordHash = hashPassword(next);
  candidate.tokenVersion = (candidate.tokenVersion ?? 0) + 1;
  await candidate.save();
  // Other sessions are now revoked; hand this browser a fresh token.
  await issueSession(res, candidate._id.toString());
});

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'Under Review',
  contacted: 'In Progress',
  scheduled: 'Scheduled',
  converted: 'Resolved',
};

// Everything the tabs need, scoped to the logged-in candidate's own email.
router.get('/dashboard', requireCandidateAuth, async (req: Request, res: Response) => {
  const email: string = (req as any).candidate.email;
  const exact = new RegExp(`^${escapeRegex(email)}$`, 'i');

  const [payments, leads] = await Promise.all([
    Payment.find({ customerEmail: exact }).sort({ createdAt: -1 }).lean(),
    Lead.find({ email }).sort({ createdAt: -1 }).lean(),
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
router.post('/enquiries', requireCandidateAuth, async (req: Request, res: Response) => {
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
