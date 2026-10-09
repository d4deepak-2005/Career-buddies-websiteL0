import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Candidate } from '../models/Candidate.ts';
import { Lead } from '../models/Lead.ts';
import { Payment } from '../models/Payment.ts';

// Team admin: registered candidate accounts (sign-ups), with payment and enquiry counts.
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

function publicAccount(c: any) {
  const identities = Array.isArray(c.identities)
    ? [...new Set(c.identities.map((i: any) => i.provider).filter(Boolean))]
    : [];
  return {
    id: String(c._id),
    email: c.email || '',
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    mobile: c.mobile || '',
    accountType: c.accountType === 'mentor' ? 'mentor' : 'mentee',
    emailVerified: !!c.emailVerified,
    hasPassword: c.hasPassword !== false,
    providers: identities,
    currentDesignation: c.currentDesignation || '',
    totalExperience: c.totalExperience || '',
    targetRole: c.targetRole || '',
    linkedinUrl: c.linkedinUrl || '',
    joinedAt: c.createdAt,
  };
}

function rupees(p: any): number | null {
  const raw = p.status === 'succeeded' && typeof p.amount === 'number' ? p.amount : p.expectedAmount ?? p.amount;
  return typeof raw === 'number' ? raw / 100 : null;
}

export async function listAdminCandidates(_req: Request, res: Response) {
  try {
    const docs = await Candidate.find()
      .select('-passwordHash -tokenVersion -resetTokenHash -resetTokenExpires -resetRequestedAt')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const ids = docs.map((d: any) => d._id);
    const [payAgg, leadAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { candidateId: { $in: ids } } },
        {
          $group: {
            _id: '$candidateId',
            payments: { $sum: 1 },
            paid: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
          },
        },
      ]),
      Lead.aggregate([
        { $match: { candidateId: { $in: ids } } },
        { $group: { _id: '$candidateId', enquiries: { $sum: 1 } } },
      ]),
    ]);

    const payBy = new Map(payAgg.map((r: any) => [String(r._id), r]));
    const leadBy = new Map(leadAgg.map((r: any) => [String(r._id), r]));

    res.json({
      success: true,
      items: docs.map((c: any) => {
        const pay = payBy.get(String(c._id));
        const lead = leadBy.get(String(c._id));
        return {
          ...publicAccount(c),
          paymentCount: pay?.payments || 0,
          paidCount: pay?.paid || 0,
          enquiryCount: lead?.enquiries || 0,
        };
      }),
    });
  } catch (error) {
    console.error('[Admin] Candidates list failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Unable to load users.' });
  }
}

export async function getAdminCandidate(req: Request, res: Response) {
  if (!isId(req.params.id)) {
    res.status(400).json({ success: false, error: 'Invalid user id.' });
    return;
  }

  try {
    const c = await Candidate.findById(req.params.id)
      .select('-passwordHash -tokenVersion -resetTokenHash -resetTokenExpires -resetRequestedAt')
      .lean();
    if (!c) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const oid = new mongoose.Types.ObjectId(req.params.id);
    const [payments, leads] = await Promise.all([
      Payment.find({ candidateId: oid }).sort({ createdAt: -1 }).limit(50).lean(),
      Lead.find({ candidateId: oid }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    res.json({
      success: true,
      candidate: publicAccount(c),
      payments: payments.map((p: any) => ({
        orderRef: p.orderRef,
        itemType: p.itemType,
        itemName: p.itemName,
        status: p.status,
        amount: rupees(p),
        currency: p.currency || p.expectedCurrency || 'INR',
        createdAt: p.createdAt,
      })),
      enquiries: leads.map((l: any) => ({
        id: String(l._id),
        createdAt: l.createdAt,
        source: l.source,
        status: l.status,
        requirement: l.requirement,
        planInterest: l.planInterest,
      })),
    });
  } catch (error) {
    console.error('[Admin] Candidate detail failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Unable to load this user.' });
  }
}
