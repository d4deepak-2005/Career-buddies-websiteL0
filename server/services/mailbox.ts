import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { isEmailConfigured } from './mailer.ts';

export function mailboxStatus() {
  const { host, user } = imapSettings();
  return {
    smtp: isEmailConfigured(),
    imap: isImapConfigured(),
    from: process.env.EMAIL_FROM || '',
    inboxUser: user || '',
    imapHost: host || '',
  };
}

function imapSettings() {
  const smtpHost = process.env.SMTP_HOST || '';
  const host =
    process.env.IMAP_HOST ||
    (smtpHost.includes('hostinger.com') ? 'imap.hostinger.com' : '');
  return {
    host,
    port: Number(process.env.IMAP_PORT) || 993,
    secure: process.env.IMAP_SECURE ? process.env.IMAP_SECURE === 'true' : true,
    user: process.env.IMAP_USER || process.env.SMTP_USER || '',
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS || '',
  };
}

export function isImapConfigured() {
  const { host, user, pass } = imapSettings();
  return !!(host && user && pass);
}

async function withImap<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  if (!isImapConfigured()) {
    throw new Error('IMAP is not configured.');
  }
  const settings = imapSettings();
  const client = new ImapFlow({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.user, pass: settings.pass },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

function formatAddresses(value: unknown): string {
  if (!value) return '';
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((entry: any) => {
      const name = String(entry?.name || '').trim();
      const address = String(entry?.address || entry?.email || '').trim();
      if (name && address) return `${name} <${address}>`;
      return address || name;
    })
    .filter(Boolean)
    .join(', ');
}

export async function listInbox(limit = 40) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const exists = Number(client.mailbox?.exists || 0);
      if (exists === 0) return [];
      const start = Math.max(1, exists - Math.min(Math.max(limit, 1), 80) + 1);
      const items: {
        uid: number;
        from: string;
        to: string;
        subject: string;
        date: string;
        seen: boolean;
      }[] = [];
      for await (const msg of client.fetch(`${start}:${exists}`, {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
      })) {
        const envelope = msg.envelope;
        items.push({
          uid: Number(msg.uid),
          from: formatAddresses(envelope?.from),
          to: formatAddresses(envelope?.to),
          subject: String(envelope?.subject || '(No subject)'),
          date: (msg.internalDate || envelope?.date || new Date()).toISOString(),
          seen: Boolean(msg.flags?.has('\\Seen')),
        });
      }
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } finally {
      lock.release();
    }
  });
}

export async function readInboxMessage(uid: number) {
  return withImap(async (client) => {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const raw = await client.fetchOne(
        String(uid),
        { uid: true, source: true, envelope: true, flags: true, internalDate: true },
        { uid: true }
      );
      if (!raw?.source) return null;
      const parsed = await simpleParser(raw.source);
      const text = String(parsed.text || '')
        .trim()
        .slice(0, 20_000);
      const htmlText = String(parsed.textAsHtml || parsed.html || '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20_000);
      return {
        uid,
        from: formatAddresses(parsed.from?.value || raw.envelope?.from),
        to: formatAddresses(parsed.to?.value || raw.envelope?.to),
        subject: String(parsed.subject || raw.envelope?.subject || '(No subject)'),
        date: (parsed.date || raw.internalDate || new Date()).toISOString(),
        seen: Boolean(raw.flags?.has('\\Seen')),
        text: text || htmlText || '(No readable text in this message.)',
      };
    } finally {
      lock.release();
    }
  });
}
