import nodemailer, { type Transporter } from 'nodemailer';

// Transactional email over plain SMTP (works with any provider: Gmail/Workspace
// app password, Zoho, SendGrid/Mailgun/Resend/SES SMTP, ...). No provider is
// hard-wired. Credentials come only from the server environment.
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('[Mail] Email is not configured (SMTP_HOST / EMAIL_FROM); message not sent.');
    return false;
  }
  await getTransporter().sendMail({ from: process.env.EMAIL_FROM, ...opts });
  return true;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function layout(baseUrl: string, title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f1f3ff;font-family:Arial,Helvetica,sans-serif;color:#061b3b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #cbdaff">
<tr><td style="background:#002869;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">CareerBuddies <span style="color:#79fd8d;font-size:12px;font-weight:normal">Your Career | Our Guidance</span></td></tr>
<tr><td style="padding:28px"><h2 style="margin:0 0 14px;font-size:20px;color:#061b3b">${esc(title)}</h2>${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px;background:#f9f9ff;color:#747783;font-size:12px">This is an automated message from CareerBuddies (${esc(baseUrl.replace(/^https?:\/\//, ''))}). Please do not reply.</td></tr>
</table></td></tr></table></body></html>`;
}

export function passwordResetEmail(baseUrl: string, link: string, minutes: number) {
  const html = layout(
    baseUrl,
    'Reset your password',
    `<p style="line-height:1.6;margin:0 0 16px">We received a request to reset the password for your CareerBuddies account. Click the button below to choose a new password.</p>
<p style="margin:0 0 20px"><a href="${esc(link)}" style="background:#006e29;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">Reset Password</a></p>
<p style="line-height:1.6;margin:0 0 12px;font-size:14px">This link works once and expires in <strong>${minutes} minutes</strong>.</p>
<p style="line-height:1.6;margin:0 0 12px;font-size:13px;color:#434652">If the button does not work, copy this address into your browser:<br><span style="word-break:break-all">${esc(link)}</span></p>
<p style="line-height:1.6;margin:0;font-size:13px;color:#434652">If you did not ask for this, you can safely ignore this email - your password will not change.</p>`
  );
  const text = `Reset your CareerBuddies password\n\nWe received a request to reset the password for your account. Open this link to choose a new password (it works once and expires in ${minutes} minutes):\n\n${link}\n\nIf you did not ask for this, ignore this email - your password will not change.\n`;
  return { subject: 'Reset your CareerBuddies password', html, text };
}

export function socialOnlyEmail(baseUrl: string, providers: string[]) {
  const list = providers.join(' / ') || 'your social account';
  const html = layout(
    baseUrl,
    'Sign in with your social account',
    `<p style="line-height:1.6;margin:0 0 14px">Someone asked to reset the password for this email address on CareerBuddies. Your account does not use a password - it signs in with <strong>${esc(list)}</strong>.</p>
<p style="line-height:1.6;margin:0 0 14px">Go to the CareerBuddies login and choose <strong>${esc(list)}</strong> to sign in. Nothing has been changed on your account.</p>
<p style="line-height:1.6;margin:0;font-size:13px;color:#434652">If this wasn't you, you can ignore this email.</p>`
  );
  const text = `Your CareerBuddies account signs in with ${list}, not a password. Use the ${list} button on the login screen. Nothing was changed. If this wasn't you, ignore this email.\n`;
  return { subject: 'Sign in to CareerBuddies with your social account', html, text };
}
