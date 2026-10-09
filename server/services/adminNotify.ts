import type { Response } from 'express';

export type AdminNoticeType = 'lead' | 'query' | 'payment' | 'user';

export interface AdminNotice {
  id: string;
  type: AdminNoticeType;
  title: string;
  body: string;
  createdAt: string;
  tab: 'leads' | 'payments' | 'users';
}

const QUERY_SOURCES = /counselling|contact|advisor|check-?in|enquiry|inquiry|form/i;
const clients = new Set<Response>();

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value || ''));
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

function rupees(p: any): number | null {
  const raw = p.status === 'succeeded' && typeof p.amount === 'number' ? p.amount : p.expectedAmount ?? p.amount;
  return typeof raw === 'number' ? raw / 100 : null;
}

export function noticeFromLead(l: any): AdminNotice {
  const query = QUERY_SOURCES.test(String(l.source || ''));
  const name = `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Someone';
  return {
    id: `lead:${l._id}`,
    type: query ? 'query' : 'lead',
    title: query ? `New query from ${name}` : `New lead: ${name}`,
    body: String(l.requirement || l.planInterest || l.source || '').slice(0, 180),
    createdAt: iso(l.createdAt),
    tab: 'leads',
  };
}

export function noticeFromPayment(p: any): AdminNotice {
  const amount = rupees(p);
  const paid = p.status === 'succeeded';
  const label = amount != null ? `₹${amount.toLocaleString('en-IN')}` : 'Payment';
  return {
    id: `payment:${p._id}`,
    type: 'payment',
    title: paid ? `Payment received · ${label}` : `Checkout ${p.status || 'started'} · ${label}`,
    body: `${p.customerName || p.customerEmail || 'Customer'} · ${p.itemName || p.itemType || 'item'}`,
    createdAt: iso(p.createdAt),
    tab: 'payments',
  };
}

export function noticeFromUser(u: any): AdminNotice {
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'New user';
  return {
    id: `user:${u._id}`,
    type: 'user',
    title: `New user: ${name}`,
    body: String(u.email || ''),
    createdAt: iso(u.createdAt),
    tab: 'users',
  };
}

export function publishAdminNotice(item: AdminNotice) {
  const payload = `event: notice\ndata: ${JSON.stringify(item)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

export function notifyLead(doc: any) {
  if (doc) publishAdminNotice(noticeFromLead(doc));
}

export function notifyPayment(doc: any) {
  if (doc) publishAdminNotice(noticeFromPayment(doc));
}

export function notifyUser(doc: any) {
  if (doc) publishAdminNotice(noticeFromUser(doc));
}

export function addAdminSseClient(res: Response) {
  clients.add(res);
  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  const beat = setInterval(() => {
    if (!clients.has(res)) {
      clearInterval(beat);
      return;
    }
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(beat);
      clients.delete(res);
    }
  }, 25000);
  res.on('close', () => {
    clearInterval(beat);
    clients.delete(res);
  });
}
