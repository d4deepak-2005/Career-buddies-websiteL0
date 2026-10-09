import { Request, Response } from 'express';
import { Lead } from '../models/Lead.ts';
import { Candidate } from '../models/Candidate.ts';
import { OutboundMail } from '../models/OutboundMail.ts';
import { isEmailConfigured, sendMail } from '../services/mailer.ts';
import { listInbox, mailboxStatus, readInboxMessage } from '../services/mailbox.ts';
import { actorFromReq, recordAdminAudit } from '../services/adminAudit.ts';
import { getPublicBaseUrl } from '../config/baseUrl.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BULK = 80;
const ADMIN_MAIL_TEMPLATES = {
  default: {
    eyebrow: 'Career guidance',
    accent: '#006e29',
    soft: '#effaf2',
    title: 'Next steps from CareerBuddies',
    note: 'A structured follow-up from the CareerBuddies advisory team.',
  },
  'lead-follow-up': {
    eyebrow: 'Lead follow-up',
    accent: '#2f5fbf',
    soft: '#eef2ff',
    title: 'Thanks for reaching out',
    note: 'We are reviewing your career goal and will help you choose the right next step.',
  },
  'counselling-next-steps': {
    eyebrow: 'Counselling',
    accent: '#006e29',
    soft: '#effaf2',
    title: 'Your counselling next steps',
    note: 'Share your preferred slot and we will align the session to your goal.',
  },
  'programme-update': {
    eyebrow: 'Programme update',
    accent: '#7a4b00',
    soft: '#fff7e6',
    title: 'CareerBuddies update',
    note: 'Relevant guidance, programmes, and sessions for your career stage.',
  },
} as const;

type AdminMailTemplateKey = keyof typeof ADMIN_MAIL_TEMPLATES;

function fullName(row: any) {
  return `${row.firstName || ''} ${row.lastName || ''}`.trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function templateFor(raw: string): AdminMailTemplateKey {
  return raw in ADMIN_MAIL_TEMPLATES ? raw as AdminMailTemplateKey : 'default';
}

function bodyHtml(body: string) {
  return body
    .trim()
    .split(/\n{2,}/)
    .map((part) => `<p style="line-height:1.68;margin:0 0 14px;color:#273047;font-size:14px">${esc(part).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function composeBodies(subject: string, body: string, templateKey = 'default') {
  const text = body.trim();
  const template = ADMIN_MAIL_TEMPLATES[templateFor(templateKey)];
  const domain = (getPublicBaseUrl() || '').replace(/^https?:\/\//, '') || 'careerbuddies.in';
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#eef2fb;font-family:Arial,Helvetica,sans-serif;color:#061b3b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2fb"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d8e1f7;box-shadow:0 18px 46px rgba(6,27,59,0.10)">
<tr><td style="background:#002869;padding:0">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
    <td style="padding:24px 28px">
      <div style="font-size:22px;line-height:1;font-weight:800;color:#ffffff">CareerBuddies</div>
      <div style="margin-top:7px;font-size:12px;color:#bcd0ff">Your Career | Our Guidance</div>
    </td>
    <td align="right" style="padding:24px 28px">
      <div style="display:inline-block;background:${template.accent};color:#ffffff;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:700">${esc(template.eyebrow)}</div>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:0 28px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:${template.soft};border:1px solid #dbe5fb;border-radius:16px">
    <tr><td style="padding:20px">
      <div style="font-size:13px;color:${template.accent};font-weight:800;text-transform:uppercase;letter-spacing:0.08em">${esc(template.title)}</div>
      <h1 style="margin:9px 0 0;color:#061b3b;font-size:24px;line-height:1.25">${esc(subject)}</h1>
      <p style="margin:10px 0 0;color:#4b5568;font-size:13px;line-height:1.55">${esc(template.note)}</p>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:24px 28px 4px">
  ${bodyHtml(text)}
</td></tr>
<tr><td style="padding:8px 28px 26px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fbff;border:1px solid #e0e8ff;border-radius:14px">
    <tr>
      <td style="padding:14px 16px;font-size:13px;line-height:1.55;color:#434652">
        <strong style="color:#061b3b">Need help choosing the right option?</strong><br>
        Reply with your current role, experience, target role, and preferred time. Our team will guide you.
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:18px 28px;background:#f9f9ff;color:#747783;font-size:12px;line-height:1.5;border-top:1px solid #e0e8ff">
  CareerBuddies (${esc(domain)})<br>
  This message was sent by the CareerBuddies team.
</td></tr>
</table></td></tr></table></body></html>`;
  return { html, text };
}

function parseEmails(raw: string) {
  const unique = new Set<string>();
  String(raw || '')
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => EMAIL_RE.test(value))
    .forEach((value) => unique.add(value));
  return [...unique].slice(0, MAX_BULK);
}

export function getMailStatus(_req: Request, res: Response) {
  res.json({ success: true, ...mailboxStatus() });
}

export async function listMailInbox(req: Request, res: Response) {
  try {
    const items = await listInbox(40);
    res.json({ success: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load inbox.';
    res.status(502).json({ success: false, error: message });
  }
}

export async function getMailInboxMessage(req: Request, res: Response) {
  const uid = Number(req.params.uid);
  if (!Number.isFinite(uid) || uid <= 0) {
    res.status(400).json({ success: false, error: 'Invalid message.' });
    return;
  }
  try {
    const item = await readInboxMessage(uid);
    if (!item) {
      res.status(404).json({ success: false, error: 'Message not found.' });
      return;
    }
    res.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open message.';
    res.status(502).json({ success: false, error: message });
  }
}

export async function listSentMail(_req: Request, res: Response) {
  const items = await OutboundMail.find().sort({ createdAt: -1 }).limit(80).lean();
  res.json({
    success: true,
    items: items.map((row) => ({
      id: String(row._id),
      to: row.to,
      subject: row.subject,
      body: row.body,
      audience: row.audience,
      status: row.status,
      error: row.error || '',
      actorName: row.actorName || '',
      createdAt: row.createdAt,
    })),
  });
}

export async function listMailRecipients(req: Request, res: Response) {
  const source = String(req.query?.source || 'leads');
  const search = String(req.query?.search || '').trim().toLowerCase();
  const rx = search ? new RegExp(escapeRegExp(search), 'i') : null;

  try {
    if (source === 'users') {
      const users = await Candidate.find({
        email: { $nin: [null, ''] },
        ...(rx ? { $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { mobile: rx }, { currentDesignation: rx }, { targetRole: rx }] } : {}),
      })
        .select('email firstName lastName mobile accountType currentDesignation targetRole createdAt')
        .sort({ createdAt: -1 })
        .limit(MAX_BULK)
        .lean();
      const items = users
        .map((row: any) => {
          const name = fullName(row) || row.email;
          const meta = [row.accountType, row.currentDesignation, row.targetRole].filter(Boolean).join(' · ');
          return {
            id: String(row._id),
            source: 'users',
            name,
            email: String(row.email || '').toLowerCase(),
            meta,
            mobile: row.mobile || '',
            createdAt: row.createdAt,
          };
        })
        .filter((row) => EMAIL_RE.test(row.email))
        .slice(0, MAX_BULK);
      res.json({ success: true, items, total: items.length, max: MAX_BULK });
      return;
    }

    const leads = await Lead.find({
      email: { $nin: [null, ''] },
      ...(rx ? { $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { mobile: rx }, { currentRole: rx }, { experience: rx }, { planInterest: rx }, { source: rx }, { status: rx }] } : {}),
    })
      .select('email firstName lastName mobile currentRole experience planInterest source status createdAt')
      .sort({ createdAt: -1 })
      .limit(MAX_BULK)
      .lean();
    const items = leads
      .map((row: any) => {
        const name = fullName(row) || row.email;
        const meta = [row.currentRole, row.experience, row.planInterest || row.source, row.status].filter(Boolean).join(' · ');
        return {
          id: String(row._id),
          source: 'leads',
          name,
          email: String(row.email || '').toLowerCase(),
          meta,
          mobile: row.mobile || '',
          createdAt: row.createdAt,
        };
      })
      .filter((row) => EMAIL_RE.test(row.email))
      .slice(0, MAX_BULK);
    res.json({ success: true, items, total: items.length, max: MAX_BULK });
  } catch {
    res.status(500).json({ success: false, error: 'Could not load recipients.' });
  }
}

async function sendOne(to: string, subject: string, body: string, templateKey: string) {
  const { html, text } = composeBodies(subject, body, templateKey);
  return sendMail({ to, subject, html, text });
}

export async function sendAdminMail(req: Request, res: Response) {
  if (!isEmailConfigured()) {
    res.status(503).json({ success: false, error: 'SMTP is not configured. Add SMTP_HOST and EMAIL_FROM.' });
    return;
  }
  const to = String(req.body?.to || '').trim().toLowerCase();
  const subject = String(req.body?.subject || '').trim().slice(0, 180);
  const body = String(req.body?.body || '').trim().slice(0, 12_000);
  const templateKey = templateFor(String(req.body?.templateKey || 'default'));
  if (!EMAIL_RE.test(to) || !subject || !body) {
    res.status(400).json({ success: false, error: 'To, subject, and message are required.' });
    return;
  }
  const actor = actorFromReq(req);
  try {
    const ok = await sendOne(to, subject, body, templateKey);
    await OutboundMail.create({
      to,
      subject,
      body,
      audience: 'one',
      status: ok ? 'sent' : 'failed',
      error: ok ? '' : 'Send failed',
      actorName: actor.name,
    });
    if (!ok) {
      res.status(502).json({ success: false, error: 'Could not send this email.' });
      return;
    }
    recordAdminAudit(req, {
      action: 'create',
      entity: 'mail',
      summary: `${actor.name} sent mail to ${to}: ${subject}`,
    });
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send this email.';
    res.status(502).json({ success: false, error: message });
  }
}

export async function sendBulkMail(req: Request, res: Response) {
  if (!isEmailConfigured()) {
    res.status(503).json({ success: false, error: 'SMTP is not configured. Add SMTP_HOST and EMAIL_FROM.' });
    return;
  }
  const audience = String(req.body?.audience || 'custom');
  const subject = String(req.body?.subject || '').trim().slice(0, 180);
  const body = String(req.body?.body || '').trim().slice(0, 12_000);
  const templateKey = templateFor(String(req.body?.templateKey || 'default'));
  if (!subject || !body) {
    res.status(400).json({ success: false, error: 'Subject and message are required.' });
    return;
  }

  let recipients: string[] = [];
  if (audience === 'leads') {
    const leads = await Lead.find({ email: { $nin: [null, ''] } }).select('email').limit(MAX_BULK).lean();
    recipients = [...new Set(leads.map((row) => String(row.email || '').toLowerCase()).filter((email) => EMAIL_RE.test(email)))];
  } else if (audience === 'users') {
    const users = await Candidate.find().select('email').limit(MAX_BULK).lean();
    recipients = [...new Set(users.map((row) => String(row.email || '').toLowerCase()).filter((email) => EMAIL_RE.test(email)))];
  } else {
    recipients = parseEmails(String(req.body?.emails || ''));
  }

  if (recipients.length === 0) {
    res.status(400).json({ success: false, error: 'No valid email addresses in this audience.' });
    return;
  }

  const actor = actorFromReq(req);
  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    try {
      const ok = await sendOne(to, subject, body, templateKey);
      await OutboundMail.create({
        to,
        subject,
        body,
        audience: audience === 'leads' || audience === 'users' || audience === 'selected' ? audience : 'custom',
        status: ok ? 'sent' : 'failed',
        error: ok ? '' : 'Send failed',
        actorName: actor.name,
      });
      if (ok) sent += 1;
      else failed += 1;
    } catch (error) {
      failed += 1;
      await OutboundMail.create({
        to,
        subject,
        body,
        audience: audience === 'leads' || audience === 'users' || audience === 'selected' ? audience : 'custom',
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 180) : 'Send failed',
        actorName: actor.name,
      });
    }
  }

  recordAdminAudit(req, {
    action: 'create',
    entity: 'mail',
    summary: `${actor.name} sent bulk mail (${audience}) to ${sent} addresses: ${subject}`,
    details: { sent, failed, audience },
  });

  res.json({ success: true, sent, failed, total: recipients.length });
}
