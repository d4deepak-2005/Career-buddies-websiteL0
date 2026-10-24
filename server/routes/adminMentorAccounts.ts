import crypto from 'crypto';
import { Request, Response } from 'express';
import { Candidate } from '../models/Candidate.ts';
import { mentorInviteEmail, sendMailSafe } from '../services/mailer.ts';
import { getPublicBaseUrl } from '../config/baseUrl.ts';
import { actorFromReq, recordAdminAudit } from '../services/adminAudit.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_TTL_MINUTES = 2 * 24 * 60; // 48 hours — plenty of time to set password
const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface MentorInviteResult {
  success: boolean;
  emailSent?: boolean;
  message?: string;
  link?: string;
  error?: string;
}

export async function sendMentorInviteInternal({
  name,
  email,
  req,
  actorName,
}: {
  name: string;
  email: string;
  req: Request;
  actorName?: string;
}): Promise<MentorInviteResult> {
  const cleanName = str(name, 120);
  const cleanEmail = str(email, 200).toLowerCase();

  if (!cleanName) {
    return { success: false, error: 'Mentor name is required.' };
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return { success: false, error: 'A valid email address is required.' };
  }

  const baseUrl = getPublicBaseUrl(req);
  if (!baseUrl) {
    return {
      success: false,
      error: 'Server is not configured with a public URL (PUBLIC_BASE_URL). Cannot send invite.',
    };
  }

  // Find or create the mentor Candidate record.
  let mentor = await Candidate.findOne({ email: cleanEmail }).select('+resetTokenHash +resetTokenExpires +resetRequestedAt +tokenVersion');

  if (mentor) {
    // Existing account — make sure it is typed as mentor.
    if (mentor.accountType !== 'mentor') {
      return {
        success: false,
        error: `An account with this email already exists as a ${mentor.accountType}. Cannot convert it to a mentor account.`,
      };
    }
  } else {
    // New account — no password yet; hasPassword: false keeps them locked until they set one.
    const [firstName, ...rest] = cleanName.split(/\s+/);
    mentor = await Candidate.create({
      email: cleanEmail,
      passwordHash: crypto.randomBytes(32).toString('hex'), // placeholder, never usable
      hasPassword: false,
      accountType: 'mentor',
      firstName,
      lastName: rest.join(' '),
    });
  }

  // Issue a set-password token (same mechanism as forgot-password).
  const token = crypto.randomBytes(32).toString('base64url');
  mentor.resetTokenHash = hashToken(token);
  mentor.resetTokenExpires = new Date(Date.now() + INVITE_TTL_MINUTES * 60 * 1000);
  mentor.resetRequestedAt = new Date();
  await mentor.save();

  const link = `${baseUrl}/reset-password?token=${token}`;
  const mentorName = [mentor.firstName, mentor.lastName].filter(Boolean).join(' ') || cleanName;

  const sent = await sendMailSafe({
    to: cleanEmail,
    ...mentorInviteEmail(baseUrl, { name: mentorName, link, ttlMinutes: INVITE_TTL_MINUTES }),
  });
  console.log(`[MentorInvite] Mail to ${cleanEmail}: sent=${sent}, link=${link}`);

  const who = actorName || actorFromReq(req).name;
  recordAdminAudit(req, {
    action: 'create',
    entity: 'mentor-account',
    entityId: String(mentor._id),
    summary: `${who} invited mentor "${mentorName}" (${cleanEmail})${sent ? '' : ' — email delivery failed'}`,
  });

  return {
    success: true,
    emailSent: sent,
    message: sent
      ? `Invite email sent to ${cleanEmail}. The link expires in ${INVITE_TTL_MINUTES} minutes.`
      : `Mentor account created but the invite email could not be sent (check SMTP settings). Share the link manually.`,
    ...(sent ? {} : { link }),
  };
}

// POST /api/admin/mentor-accounts/invite
// Body: { name, email }
// - Creates mentor Candidate account if one doesn't exist yet
// - Issues a password-set token (reuses resetToken mechanism)
// - Sends invite email with the /reset-password?token=xxx link
export async function inviteMentor(req: Request, res: Response) {
  try {
    const result = await sendMentorInviteInternal({
      name: req.body?.name,
      email: req.body?.email,
      req,
    });
    if (!result.success) {
      return void res.status(400).json(result);
    }
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[MentorInvite] Error:', err?.message || err);
    res.status(500).json({ success: false, error: 'Could not process the invite. Please try again.' });
  }
}

// GET /api/admin/mentor-accounts
// Lists all Candidate accounts with accountType === 'mentor'
export async function listMentorAccounts(req: Request, res: Response) {
  try {
    const mentors = await Candidate.find({ accountType: 'mentor' })
      .select('email firstName lastName hasPassword createdAt emailVerified')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items: mentors.map((m: any) => ({
        id: String(m._id),
        email: m.email,
        name: [m.firstName, m.lastName].filter(Boolean).join(' '),
        activated: m.hasPassword === true,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[MentorAccounts] List error:', err?.message || err);
    res.status(500).json({ success: false, error: 'Could not load mentor accounts.' });
  }
}
