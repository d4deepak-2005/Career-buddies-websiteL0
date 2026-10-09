import { Request, Response } from 'express';
import { Lead } from '../models/Lead.ts';
import { Payment } from '../models/Payment.ts';
import { Candidate } from '../models/Candidate.ts';
import { verifyAdminToken } from '../middleware/adminAuth.ts';
import {
  addAdminSseClient,
  noticeFromLead,
  noticeFromPayment,
  noticeFromUser,
} from '../services/adminNotify.ts';

export async function listAdminNotifications(_req: Request, res: Response) {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [leads, payments, users] = await Promise.all([
      Lead.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(80).lean(),
      Payment.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(80).lean(),
      Candidate.find({ createdAt: { $gte: since } })
        .select('firstName lastName email createdAt')
        .sort({ createdAt: -1 })
        .limit(80)
        .lean(),
    ]);

    const items = [
      ...leads.map(noticeFromLead),
      ...payments.map(noticeFromPayment),
      ...users.map(noticeFromUser),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 80);

    res.json({ success: true, items });
  } catch (error) {
    console.error('[Admin] Notifications failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Unable to load notifications.' });
  }
}

export function streamAdminNotifications(req: Request, res: Response) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!verifyAdminToken(token)) {
    res.status(401).json({ success: false, error: 'Unauthorized. Admin login required.' });
    return;
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  addAdminSseClient(res);
}
