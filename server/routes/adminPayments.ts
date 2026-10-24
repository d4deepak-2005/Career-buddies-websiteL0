import crypto from 'crypto';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Payment } from '../models/Payment.ts';
import { Candidate } from '../models/Candidate.ts';
import { Webinar } from '../models/Webinar.ts';
import { Plan } from '../models/Plan.ts';
import { Programme } from '../models/Programme.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { recordAdminAudit } from '../services/adminAudit.ts';

// Admin-only payment granting, mounted at /api/admin/payments. For candidates who paid
// outside the online flow (UPI / bank transfer / cash): the admin finds the candidate by
// email and either promotes one of their existing payment attempts to "succeeded" or
// creates a fresh succeeded record. The candidate's dashboard derives access purely from
// succeeded Payment rows, so this is what makes the purchase show up for them.
//
// Safety rules:
//   - never invents provider state: no razorpayOrderId / razorpayPaymentId / dodoSessionId
//     is set here, so webhook/reconcile handling leaves these rows alone;
//   - never sets openKey, so the row never blocks a future online checkout and can't
//     collide with the unique partial index on openKey;
//   - every change writes details.manualPayment { by, method, note, at } on the payment
//     AND a recordAdminAudit entry (visible in Admin > Logs), so there is a full trail of
//     who granted what and how the money actually arrived.

export const adminPaymentsRouter = express.Router();
adminPaymentsRouter.use(requireAdminAuth);

const MODELS: Record<string, mongoose.Model<any>> = {
  webinar: Webinar,
  plan: Plan,
  programme: Programme,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_REF_RE = /^[a-f0-9]{18}$/i;
const MARKABLE = ['created', 'processing', 'failed', 'cancelled', 'expired'];
const METHODS = ['upi', 'bank_transfer', 'cash', 'other'] as const;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanMethod(v: unknown): string {
  const m = str(v, 20).toLowerCase().replace(/[\s-]+/g, '_');
  return (METHODS as readonly string[]).includes(m) ? m : '';
}

// Rupees (whole or decimal) -> paise. 0 = not a usable amount.
function toMinorUnits(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(str(v, 20).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

// Shape a payment for the admin UI: no webhook internals, amounts in rupees for display.
function serialize(p: any) {
  const minor = (v: unknown) => (typeof v === 'number' ? v / 100 : null);
  return {
    id: String(p._id),
    orderRef: p.orderRef,
    itemType: p.itemType,
    itemName: p.itemName || '',
    status: p.status,
    provider: p.provider || '',
    amount: minor(p.amount),
    currency: p.currency || '',
    expectedAmount: minor(p.expectedAmount),
    expectedCurrency: p.expectedCurrency || '',
    amountMismatch: !!p.amountMismatch,
    failureReason: p.failureReason || '',
    customerName: p.customerName || '',
    customerEmail: p.customerEmail || '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    manualPayment: p.details?.manualPayment || null,
    markable: MARKABLE.includes(p.status),
  };
}

function serializeCandidate(c: any) {
  return {
    id: String(c._id),
    name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
    email: c.email,
    mobile: c.mobile || '',
    accountType: c.accountType || 'mentee',
    createdAt: c.createdAt,
  };
}

// ---- Lookup: candidate by email + their payment attempts ------------------------------

adminPaymentsRouter.get('/lookup', async (req: Request, res: Response) => {
  const email = str(req.query.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    return;
  }

  try {
    const candidate = await Candidate.findOne({ email }).lean();
    if (!candidate) {
      res.json({ success: true, candidate: null, payments: [] });
      return;
    }

    const payments = await Payment.find({ candidateId: candidate._id })
      .select('-processedWebhookIds')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      candidate: serializeCandidate(candidate),
      payments: (payments as any[]).map(serialize),
    });
  } catch (error) {
    console.error('[AdminPayments] lookup failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Could not look up that candidate. Please try again.' });
  }
});

// ---- Mark an existing attempt as paid ---------------------------------------------------

adminPaymentsRouter.post('/:orderRef/mark-paid', async (req: Request, res: Response) => {
  const { orderRef } = req.params;
  if (!ORDER_REF_RE.test(orderRef)) {
    res.status(400).json({ success: false, error: 'Invalid order reference.' });
    return;
  }

  const method = cleanMethod(req.body?.method);
  if (!method) {
    res.status(400).json({ success: false, error: 'Choose how they paid (UPI, bank transfer, cash or other).' });
    return;
  }
  const note = str(req.body?.note, 500);

  try {
    const payment = await Payment.findOne({ orderRef }).select('-processedWebhookIds');
    if (!payment) {
      res.status(404).json({ success: false, error: 'No payment attempt with that reference.' });
      return;
    }
    if (payment.status === 'succeeded') {
      res.status(409).json({ success: false, error: 'That payment is already marked as succeeded.' });
      return;
    }

    // Amount: admin may override (e.g. they collected a different total); otherwise use
    // what the server verified when the order was created, then what the attempt held.
    const requested = req.body?.amount === undefined || req.body?.amount === '' ? 0 : toMinorUnits(req.body?.amount);
    if (req.body?.amount !== undefined && req.body?.amount !== '' && !requested) {
      res.status(400).json({ success: false, error: 'Amount must be a positive number of rupees.' });
      return;
    }
    const amount = requested || payment.expectedAmount || payment.amount || 0;
    if (!amount) {
      res.status(400).json({ success: false, error: 'No amount is known for this attempt — enter the amount paid.' });
      return;
    }
    const currency = (str(req.body?.currency, 8) || payment.expectedCurrency || payment.currency || 'INR').toUpperCase();

    const actor = (req as any).adminActor || { name: 'Owner', source: 'owner' };
    const at = new Date().toISOString();

    // One atomic, guarded update: only a non-succeeded row can become succeeded, so a
    // double-click or a webhook landing at the same time can't move it backwards.
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'succeeded' } },
      {
        $set: {
          status: 'succeeded',
          amount,
          currency,
          amountMismatch:
            payment.expectedAmount != null && payment.expectedAmount !== amount
              ? true
              : payment.expectedCurrency
                ? payment.expectedCurrency !== currency
                : false,
          failureReason: '',
          lastEventType: 'manual.mark_paid',
          lastEventAt: new Date(),
          'details.manualPayment': { by: String(actor.name || 'Owner'), method, note, at },
        },
        $unset: { openKey: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      res.status(409).json({ success: false, error: 'That payment is already marked as succeeded.' });
      return;
    }

    recordAdminAudit(req, {
      action: 'status',
      entity: 'payment',
      entityId: orderRef,
      summary: `Marked "${payment.itemName || payment.itemType}" as paid (${method}) for ${payment.customerEmail || 'candidate'}`,
      details: { amount: amount / 100, currency, method, note: note || undefined },
    });

    console.log(`[AdminPayments] order ${orderRef} marked paid (${method}) by ${actor.name}.`);
    res.json({ success: true, payment: serialize(updated.toObject()) });
  } catch (error) {
    console.error('[AdminPayments] mark-paid failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Could not mark that payment as paid. Please try again.' });
  }
});

// ---- Grant access when there is no payment attempt at all -------------------------------

adminPaymentsRouter.post('/create-manual', async (req: Request, res: Response) => {
  const email = str(req.body?.candidateEmail, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ success: false, error: 'Enter the candidate’s email address.' });
    return;
  }

  const itemType = str(req.body?.itemType, 20);
  if (!Object.prototype.hasOwnProperty.call(MODELS, itemType)) {
    res.status(400).json({ success: false, error: 'Choose what they bought (webinar, plan or programme).' });
    return;
  }

  const method = cleanMethod(req.body?.method);
  if (!method) {
    res.status(400).json({ success: false, error: 'Choose how they paid (UPI, bank transfer, cash or other).' });
    return;
  }
  const note = str(req.body?.note, 500);
  const amountMinor = toMinorUnits(req.body?.amount);
  if (!amountMinor) {
    res.status(400).json({ success: false, error: 'Enter the amount they paid (in rupees).' });
    return;
  }
  const currency = (str(req.body?.currency, 8) || 'INR').toUpperCase();

  try {
    const candidate = await Candidate.findOne({ email }).lean();
    if (!candidate) {
      res.status(404).json({ success: false, error: 'No candidate account with that email. They must sign up first.' });
      return;
    }

    const itemId = str(req.body?.itemId, 40);
    if (!mongoose.isValidObjectId(itemId)) {
      res.status(400).json({ success: false, error: 'Choose the item they bought.' });
      return;
    }
    const record = await MODELS[itemType].findById(itemId).lean();
    if (!record) {
      res.status(404).json({ success: false, error: 'That item no longer exists.' });
      return;
    }

    // The dashboard lists one card per succeeded payment, so granting the same item twice
    // would show it twice. Point the admin at the existing succeeded row instead.
    const duplicate = await Payment.findOne({
      candidateId: candidate._id,
      itemType,
      itemId: String(record._id),
      status: 'succeeded',
    }).select('orderRef');
    if (duplicate) {
      res.status(409).json({
        success: false,
        error: `This candidate already has a succeeded payment for that item (order ${duplicate.orderRef}).`,
      });
      return;
    }

    const label = String(record.title || record.name || itemType).slice(0, 200);
    const orderRef = crypto.randomBytes(9).toString('hex');
    const actor = (req as any).adminActor || { name: 'Owner', source: 'owner' };
    const at = new Date().toISOString();

    const created = await Payment.create({
      orderRef,
      itemType,
      itemId: String(record._id),
      itemName: label,
      provider: 'manual',
      status: 'succeeded',
      amount: amountMinor,
      currency,
      expectedAmount: amountMinor,
      expectedCurrency: currency,
      amountMismatch: false,
      candidateId: candidate._id,
      customerName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
      customerEmail: candidate.email,
      customerMobile: candidate.mobile || '',
      lastEventType: 'manual.create',
      lastEventAt: new Date(),
      // Deliberately absent: openKey, razorpayOrderId, razorpayPaymentId, dodoSessionId, checkoutUrl.
      details: { manualPayment: { by: String(actor.name || 'Owner'), method, note, at } },
    });

    recordAdminAudit(req, {
      action: 'create',
      entity: 'payment',
      entityId: orderRef,
      summary: `Manually granted "${label}" to ${candidate.email} (${method})`,
      details: { itemType, amount: amountMinor / 100, currency, method, note: note || undefined },
    });

    console.log(`[AdminPayments] manual ${itemType} grant (${method}) for order ${orderRef} by ${actor.name}.`);
    res.status(201).json({ success: true, payment: serialize(created.toObject()) });
  } catch (error) {
    console.error('[AdminPayments] create-manual failed:', (error as any)?.message);
    res.status(500).json({ success: false, error: 'Could not create the payment record. Please try again.' });
  }
});
