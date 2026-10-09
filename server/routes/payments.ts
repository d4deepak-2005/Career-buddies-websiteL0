import crypto from 'crypto';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { Payment } from '../models/Payment.ts';
import { Webinar } from '../models/Webinar.ts';
import { Plan } from '../models/Plan.ts';
import { Programme } from '../models/Programme.ts';
import { getPublicBaseUrl } from '../config/baseUrl.ts';
import { isEmailConfigured, paymentSuccessEmail, sendMailSafe } from '../services/mailer.ts';
import { requireCandidateAuth } from '../middleware/candidateAuth.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { GST_PERCENT, withGstPaise } from '../utils/gst.ts';
import { notifyPayment } from '../services/adminNotify.ts';

// Razorpay integration.
//   Orders:   https://razorpay.com/docs/api/orders/create/
//   Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
//   Webhooks: https://razorpay.com/docs/webhooks/validate-test/
// Secrets come only from environment variables — never from the frontend.

const MODELS: Record<string, mongoose.Model<any>> = {
  webinar: Webinar,
  plan: Plan,
  programme: Programme,
};

let cachedClient: Razorpay | null = null;

function cleanEnv(value: string | undefined): string {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getKeys(): { keyId: string; keySecret: string } | null {
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID);
  const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);
  if (!keyId || !keySecret) return null;
  if (keyId.startsWith('rzp_live_') && process.env.RAZORPAY_ALLOW_LIVE_MODE !== 'true') {
    console.error('[Razorpay] live key set but RAZORPAY_ALLOW_LIVE_MODE is not true; payments are disabled.');
    return null;
  }
  return { keyId, keySecret };
}

function getClient(): Razorpay | null {
  const keys = getKeys();
  if (!keys) return null;
  if (!cachedClient) {
    try {
      cachedClient = new Razorpay({ key_id: keys.keyId, key_secret: keys.keySecret });
    } catch {
      console.error('[Razorpay] Invalid payment configuration; payments are disabled.');
      return null;
    }
  }
  return cachedClient;
}

{
  const keys = getKeys();
  if (keys) {
    console.log(`[Razorpay] ${isTestMode() ? 'Test' : 'Live'} keys loaded (${keys.keyId.slice(0, 12)}…)`);
  } else {
    console.warn('[Razorpay] Payments disabled — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
}

function isTestMode(): boolean {
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID);
  return !keyId.startsWith('rzp_live_');
}

function getAppUrl(req: Request): string | null {
  return getPublicBaseUrl(req);
}

function isLocalAppUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

function safeDetails(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>).slice(0, 20)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key.slice(0, 60).replace(/[.$]/g, '_')] = String(value).slice(0, 300);
    }
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_REF_RE = /^[a-f0-9]{18}$/;

const OPEN_REUSE_MS = 30 * 60 * 1000;
const EXPIRE_AFTER_MS = 60 * 60 * 1000;
const RECONCILE_MIN_MS = 15 * 1000;
const TERMINAL = ['succeeded', 'failed', 'cancelled'];

function cmsMinorAmount(itemType: string, record: any): number {
  const raw = itemType === 'webinar' ? record.priceINR : itemType === 'programme' ? record.feeINR : record.priceINR;
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

type Resolved =
  | { ok: true; record: any; label: string; cmsAmount: number; baseAmount: number; gstAmount: number }
  | { ok: false; status: number; error: string };

async function resolveItem(itemType: any, itemId: any): Promise<Resolved> {
  if (typeof itemType !== 'string' || !Object.prototype.hasOwnProperty.call(MODELS, itemType)) {
    return { ok: false, status: 400, error: 'Invalid item type.' };
  }
  let record: any = null;
  if (typeof itemId === 'string' && mongoose.isValidObjectId(itemId)) {
    record = await MODELS[itemType].findOne({ _id: itemId, visible: { $ne: false } });
  }
  if (!record) return { ok: false, status: 404, error: 'This item is not available.' };

  const baseAmount = cmsMinorAmount(itemType, record);
  if (!baseAmount) {
    return { ok: false, status: 400, error: 'Online payment is currently unavailable for this item.' };
  }
  if (itemType === 'plan' && record.isCustomPricing) {
    return { ok: false, status: 400, error: 'Online payment is currently unavailable for this item.' };
  }
  const priced = withGstPaise(baseAmount);
  return {
    ok: true,
    record,
    label: String(record.title || record.name || itemType).slice(0, 200),
    cmsAmount: priced.totalPaise,
    baseAmount: priced.basePaise,
    gstAmount: priced.gstPaise,
  };
}

const UNAVAILABLE = 'Online payment is currently unavailable for this item.';

async function findSucceededPayment(candidateId: unknown, itemType: string, itemId: string) {
  return Payment.findOne({
    candidateId,
    itemType,
    itemId: String(itemId),
    status: 'succeeded',
  }).sort({ createdAt: -1 });
}

export const paymentsRouter = express.Router();

paymentsRouter.get('/owned', requireCandidateAuth, async (req: Request, res: Response) => {
  try {
    const rows = await Payment.find({
      candidateId: (req as any).candidate._id,
      status: 'succeeded',
      itemType: { $in: ['webinar', 'plan', 'programme'] },
    })
      .select('itemType itemId')
      .lean();
    const items: Record<string, string[]> = { webinar: [], plan: [], programme: [] };
    for (const row of rows as any[]) {
      const list = items[row.itemType];
      if (list && row.itemId && !list.includes(row.itemId)) list.push(row.itemId);
    }
    res.json({ success: true, items });
  } catch (error) {
    console.error('[Payments] Owned list error:', error);
    res.status(500).json({ success: false, error: 'Unable to load purchases.' });
  }
});

paymentsRouter.post('/quote', requireCandidateAuth, async (req: Request, res: Response) => {
  if (!getClient()) {
    res.status(503).json({ success: false, error: 'Online payments are not configured yet. Please contact CareerBuddies.' });
    return;
  }
  try {
    const item = await resolveItem(req.body?.itemType, req.body?.itemId);
    if (item.ok === false) {
      res.status(item.status).json({ success: false, error: item.error });
      return;
    }
    const owned = await findSucceededPayment((req as any).candidate._id, req.body?.itemType, String(item.record._id));
    res.json({
      success: true,
      itemName: item.label,
      amount: item.cmsAmount / 100,
      baseAmount: item.baseAmount / 100,
      gstAmount: item.gstAmount / 100,
      gstPercent: GST_PERCENT,
      currency: 'INR',
      testMode: isTestMode(),
      alreadyPaid: Boolean(owned),
      orderRef: owned?.orderRef,
    });
  } catch (error) {
    console.error('[Payments] Quote error:', error);
    res.status(500).json({ success: false, error: 'Unable to load payment details.' });
  }
});

function formatCheckoutDescription(itemName: string | undefined, totalPaise: number) {
  const rupees = (Math.round(Number(totalPaise) || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const label = itemName || 'CareerBuddies payment';
  return `${label} · ₹${rupees} incl. ${GST_PERCENT}% GST`;
}

function checkoutPayload(
  payment: any,
  candidate: { name: string; email: string; mobile: string },
  callbackUrl?: string
) {
  const keys = getKeys();
  const amount = Math.round(Number(payment.expectedAmount) || 0);
  return {
    success: true,
    orderRef: payment.orderRef,
    keyId: keys?.keyId,
    razorpayOrderId: payment.razorpayOrderId,
    amount,
    currency: payment.expectedCurrency || 'INR',
    itemName: payment.itemName,
    description: formatCheckoutDescription(payment.itemName, amount),
    customer: candidate,
    callbackUrl: callbackUrl || '',
  };
}

paymentsRouter.post('/checkout', requireCandidateAuth, async (req: Request, res: Response) => {
  const client = getClient();

  if (!client) {
    res.status(503).json({
      success: false,
      error: 'Online payments are not configured yet. Please contact CareerBuddies.',
    });
    return;
  }

  const { itemType, itemId, customer, details } = req.body || {};
  const candidate = (req as any).candidate;
  const name = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim().slice(0, 120);
  const email = String(candidate.email || '').trim().toLowerCase().slice(0, 200);
  const mobile = String(customer?.mobile || candidate.mobile || '').trim().slice(0, 30);

  if (!name || !EMAIL_RE.test(email)) {
    res.status(400).json({ success: false, error: 'A valid name and email are required.' });
    return;
  }

  try {
    const item = await resolveItem(itemType, itemId);
    if (item.ok === false) {
      res.status(item.status).json({ success: false, error: item.error });
      return;
    }
    const { record, label, cmsAmount, baseAmount, gstAmount } = item;

    const owned = await findSucceededPayment(candidate._id, itemType, String(record._id));
    if (owned) {
      res.json({
        success: true,
        alreadyPaid: true,
        orderRef: owned.orderRef,
        itemName: owned.itemName || label,
      });
      return;
    }

    const appUrl = getAppUrl(req);
    if (!appUrl) {
      console.error('[Payments] PUBLIC_BASE_URL is not configured; checkout is unavailable.');
      res.status(503).json({
        success: false,
        error: 'Online payments are temporarily unavailable. Please contact CareerBuddies.',
      });
      return;
    }

    const keys = getKeys();
    if (!isTestMode() && isLocalAppUrl(appUrl)) {
      res.status(400).json({
        success: false,
        error:
          'Razorpay live checkout cannot run on localhost. Use test keys on this computer, or open the site on your public HTTPS domain with these live keys.',
      });
      return;
    }

    const returnUrl = (orderRef: string) =>
      `${appUrl}/api/payments/return?ref=${encodeURIComponent(orderRef)}`;

    const openKey = `${candidate._id}:${itemType}:${record._id}`;
    const reuse = async (): Promise<boolean> => {
      const existing = await Payment.findOne({ openKey });
      if (!existing) return false;
      const fresh = Date.now() - new Date(existing.createdAt).getTime() < OPEN_REUSE_MS;
      const sameKey = Boolean(keys?.keyId && existing.razorpayKeyId && existing.razorpayKeyId === keys.keyId);
      if (fresh && existing.status === 'processing' && sameKey) {
        res.json({ success: true, orderRef: existing.orderRef, alreadyProcessing: true });
        return true;
      }
      if (
        fresh &&
        existing.status === 'created' &&
        existing.razorpayOrderId &&
        sameKey &&
        existing.expectedAmount === cmsAmount &&
        existing.gstRate === GST_PERCENT &&
        existing.gstAmount === gstAmount
      ) {
        res.json(checkoutPayload(existing, { name, email, mobile }, returnUrl(existing.orderRef)));
        return true;
      }
      await Payment.updateOne({ _id: existing._id, openKey }, { $unset: { openKey: 1 } });
      return false;
    };
    if (await reuse()) return;

    const orderRef = crypto.randomBytes(9).toString('hex');
    let payment: any;
    try {
      payment = await Payment.create({
        orderRef,
        itemType,
        itemId: String(record._id),
        itemName: label,
        provider: 'razorpay',
        expectedAmount: cmsAmount,
        expectedCurrency: 'INR',
        baseAmount,
        gstAmount,
        gstRate: GST_PERCENT,
        openKey,
        candidateId: candidate._id,
        customerName: name,
        customerEmail: email,
        customerMobile: mobile,
        details: safeDetails(details),
      });
    } catch (error: any) {
      if (error?.code === 11000 && (await reuse())) return;
      throw error;
    }

    try {
      const order: any = await client.orders.create({
        amount: cmsAmount,
        currency: 'INR',
        receipt: orderRef,
        notes: {
          orderRef,
          itemType,
          itemId: String(record._id),
          gstPercent: String(GST_PERCENT),
          baseAmount: String(baseAmount),
          gstAmount: String(gstAmount),
        },
      });

      if (!order?.id) throw new Error('bad_order');
      if (Number(order.amount) !== cmsAmount) {
        throw new Error('razorpay_amount_mismatch');
      }
      payment.razorpayOrderId = order.id;
      payment.razorpayKeyId = keys?.keyId || '';
      payment.expectedAmount = Number(order.amount);
      await payment.save();
      notifyPayment(payment);

      res.status(201).json(checkoutPayload(payment, { name, email, mobile }, returnUrl(orderRef)));
    } catch (rzpError: any) {
      const status = rzpError?.statusCode || rzpError?.status;
      const desc = rzpError?.error?.description || rzpError?.error?.code || rzpError?.message;
      console.error('[Razorpay] Order creation failed:', status, rzpError?.error || rzpError?.message);
      payment.status = 'failed';
      payment.failureReason = status === 401 ? 'razorpay_auth_failed' : 'checkout_creation_failed';
      payment.openKey = undefined;
      await payment.save();
      cachedClient = null;
      const authFailed = status === 401 || String(desc).toLowerCase().includes('authentication failed');
      res.status(502).json({
        success: false,
        error: authFailed
          ? 'Razorpay rejected the API keys. In Razorpay Dashboard (Test mode) copy Key ID and Key Secret into .env as RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, then restart npm run dev.'
          : 'Unable to start payment right now. Please try again shortly.',
      });
    }
  } catch (error) {
    console.error('[Payments] Checkout error:', error);
    res.status(500).json({ success: false, error: 'Unable to start payment.' });
  }
});

const RANK: Record<string, number> = {
  created: 0,
  processing: 1,
  failed: 2,
  cancelled: 2,
  expired: 0,
  succeeded: 3,
};

async function applyTransition(
  paymentId: any,
  newStatus: string,
  data: { amount?: number; currency?: string; payment_id?: string },
  eventType: string,
  changeId: string
): Promise<any | null> {
  const allowedPrev = Object.keys(RANK).filter((s) => RANK[s] <= RANK[newStatus]);
  const canApply = { $in: ['$status', allowedPrev] };
  const total = Number(data.amount ?? 0);
  const currency = String(data.currency || 'INR');

  const set: Record<string, any> = {
    processedWebhookIds: { $concatArrays: [{ $ifNull: ['$processedWebhookIds', []] }, [changeId]] },
    status: { $cond: [canApply, newStatus, '$status'] },
    razorpayPaymentId: { $cond: [canApply, { $literal: String(data.payment_id || '') }, '$razorpayPaymentId'] },
    amount: { $cond: [canApply, { $literal: total }, '$amount'] },
    currency: { $cond: [canApply, { $literal: currency }, '$currency'] },
    lastEventType: { $literal: eventType },
    lastEventAt: '$$NOW',
  };
  if (newStatus === 'succeeded') {
    set.amountMismatch = {
      $cond: [
        canApply,
        {
          $or: [
            { $and: [{ $ne: [{ $type: '$expectedAmount' }, 'missing'] }, { $ne: ['$expectedAmount', total] }] },
            { $and: [{ $ne: [{ $ifNull: ['$expectedCurrency', ''] }, ''] }, { $ne: ['$expectedCurrency', currency] }] },
          ],
        },
        '$amountMismatch',
      ],
    };
  }
  if (TERMINAL.includes(newStatus)) {
    set.openKey = { $cond: [canApply, '$$REMOVE', '$openKey'] };
  }
  if (newStatus === 'failed') {
    set.failureReason = { $cond: [canApply, { $literal: 'payment_failed' }, '$failureReason'] };
  }

  const updated = await Payment.findOneAndUpdate(
    { _id: paymentId, processedWebhookIds: { $ne: changeId } },
    [{ $set: set }],
    { returnDocument: 'after', updatePipeline: true }
  );
  if (updated?.amountMismatch && newStatus === 'succeeded') {
    console.error(`[Payments] Paid amount differs from the verified amount for order ${updated.orderRef}; flagged for review.`);
  }
  if (updated && newStatus === 'succeeded') {
    void maybeSendPaymentReceipt(updated);
    notifyPayment(updated);
  }
  return updated;
}

function formatPaidAmount(payment: any): string {
  const paise = Number(payment.amount ?? payment.expectedAmount ?? 0);
  const rupees = paise / 100;
  const currency = String(payment.currency || payment.expectedCurrency || 'INR').toUpperCase();
  if (currency === 'INR') {
    return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
  }
  return `${currency} ${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

async function maybeSendPaymentReceipt(payment: any) {
  if (!isEmailConfigured()) return;
  const email = String(payment.customerEmail || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return;

  const claimed = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: 'succeeded',
      confirmationEmailSentAt: { $exists: false },
    },
    { $set: { confirmationEmailSentAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!claimed) return;

  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) {
    await Payment.updateOne({ _id: payment._id }, { $unset: { confirmationEmailSentAt: 1 } });
    console.warn('[Mail] Payment receipt skipped — set PUBLIC_BASE_URL.');
    return;
  }

  const sent = await sendMailSafe({
    to: email,
    ...paymentSuccessEmail(baseUrl, {
      name: String(payment.customerName || '').trim(),
      itemName: String(payment.itemName || '').trim(),
      itemType: String(payment.itemType || ''),
      amountLabel: formatPaidAmount(claimed),
      orderRef: String(claimed.orderRef || ''),
    }),
  });
  if (!sent) {
    await Payment.updateOne({ _id: payment._id }, { $unset: { confirmationEmailSentAt: 1 } });
  }
}

function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const keys = getKeys();
  if (!keys) return false;
  const expected = crypto.createHmac('sha256', keys.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function markCaptured(payment: any, remote: any, changeId: string, eventType: string) {
  const amount = Number(remote.amount);
  const currency = String(remote.currency || 'INR').toUpperCase();
  if (payment.expectedAmount && amount !== payment.expectedAmount) {
    console.error(`[Payments] Razorpay amount ${amount} != expected ${payment.expectedAmount} for ${payment.orderRef}`);
  }
  if (remote.notes?.orderRef && remote.notes.orderRef !== payment.orderRef) {
    console.warn('[Razorpay] Payment notes do not match this order; ignored.');
    return payment;
  }
  return applyTransition(
    payment._id,
    'succeeded',
    { amount, currency, payment_id: remote.id },
    eventType,
    changeId
  );
}

async function reconcileWithProvider(client: Razorpay, payment: any): Promise<any> {
  if (!payment.razorpayOrderId || !['created', 'processing'].includes(payment.status)) return payment;
  if (payment.lastProviderCheckAt && Date.now() - new Date(payment.lastProviderCheckAt).getTime() < RECONCILE_MIN_MS) {
    return payment;
  }
  await Payment.updateOne({ _id: payment._id }, { $set: { lastProviderCheckAt: new Date() } });
  try {
    const list: any = await client.orders.fetchPayments(payment.razorpayOrderId);
    const items = list?.items || [];
    const captured = items.find((p: any) => p.status === 'captured');
    const failed = items.find((p: any) => p.status === 'failed');
    if (captured) {
      const updated = await markCaptured(payment, captured, `sync:${captured.id}:succeeded`, 'sync.succeeded');
      return updated || (await Payment.findById(payment._id)) || payment;
    }
    if (failed) {
      const updated = await applyTransition(
        payment._id,
        'failed',
        { amount: failed.amount, currency: failed.currency, payment_id: failed.id },
        'sync.failed',
        `sync:${failed.id}:failed`
      );
      return updated || (await Payment.findById(payment._id)) || payment;
    }
    return payment;
  } catch (error: any) {
    console.warn('[Razorpay] Provider status lookup failed:', error?.statusCode, error?.error || error?.message);
    return payment;
  }
}

function pickReturnField(req: Request, key: string): string {
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>)[key] : '';
  const query = req.query?.[key];
  return String(body || query || '').trim();
}

function siteHome(req: Request): string {
  return getPublicBaseUrl(req) || '/';
}

// Razorpay sends the browser here after UPI / netbanking (POST form). No login cookie
// is required — the checkout signature is the proof. We then send them to /?order=.
async function handleCheckoutReturn(req: Request, res: Response) {
  const home = siteHome(req);
  const refHint = String(req.query.ref || '').trim();
  const fail = (orderRef?: string) => {
    const ref = orderRef && ORDER_REF_RE.test(orderRef) ? orderRef : ORDER_REF_RE.test(refHint) ? refHint : '';
    res.redirect(302, ref ? `${home}/?order=${encodeURIComponent(ref)}&cancelled=1` : `${home}/?cancelled=1`);
  };

  const razorpay_order_id = pickReturnField(req, 'razorpay_order_id');
  const razorpay_payment_id = pickReturnField(req, 'razorpay_payment_id');
  const razorpay_signature = pickReturnField(req, 'razorpay_signature');

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    fail();
    return;
  }
  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    console.warn('[Razorpay] Checkout return signature failed.');
    fail();
    return;
  }

  try {
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      fail();
      return;
    }

    const client = getClient();
    if (client) {
      try {
        const remote: any = await client.payments.fetch(razorpay_payment_id);
        if (remote && remote.order_id === razorpay_order_id && (remote.status === 'captured' || remote.status === 'authorized')) {
          await markCaptured(payment, remote, `return:${razorpay_payment_id}`, 'checkout.return');
        }
      } catch (error) {
        console.warn('[Razorpay] Checkout return lookup failed; redirecting with order status poll.');
      }
    }

    res.redirect(302, `${home}/?order=${encodeURIComponent(payment.orderRef)}`);
  } catch (error) {
    console.error('[Payments] Checkout return error:', error);
    fail();
  }
}

paymentsRouter.post('/return', handleCheckoutReturn);
paymentsRouter.get('/return', handleCheckoutReturn);

paymentsRouter.post('/verify', requireCandidateAuth, async (req: Request, res: Response) => {
  const client = getClient();
  if (!client) {
    res.status(503).json({ success: false, error: 'Online payments are not configured yet.' });
    return;
  }

  const razorpay_order_id = String(req.body?.razorpay_order_id || '');
  const razorpay_payment_id = String(req.body?.razorpay_payment_id || '');
  const razorpay_signature = String(req.body?.razorpay_signature || '');

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ success: false, error: 'Incomplete payment confirmation.' });
    return;
  }
  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    res.status(400).json({ success: false, error: 'Invalid payment signature.' });
    return;
  }

  try {
    const candidate = (req as any).candidate;
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, candidateId: candidate._id });
    if (!payment) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }

    const remote: any = await client.payments.fetch(razorpay_payment_id);
    if (!remote || remote.order_id !== razorpay_order_id) {
      res.status(400).json({ success: false, error: 'Payment does not belong to this order.' });
      return;
    }
    if (remote.status !== 'captured' && remote.status !== 'authorized') {
      res.status(409).json({ success: false, error: 'Payment is not complete yet.', orderRef: payment.orderRef });
      return;
    }

    await markCaptured(payment, remote, `checkout:${razorpay_payment_id}`, 'checkout.verify');
    res.json({ success: true, orderRef: payment.orderRef });
  } catch (error) {
    console.error('[Payments] Verify error:', error);
    res.status(500).json({ success: false, error: 'Unable to confirm payment.' });
  }
});

paymentsRouter.get('/status/:orderRef', requireCandidateAuth, async (req: Request, res: Response) => {
  const { orderRef } = req.params;

  if (!ORDER_REF_RE.test(orderRef)) {
    res.status(400).json({ success: false, error: 'Invalid order reference.' });
    return;
  }

  try {
    const candidate = (req as any).candidate;
    let payment = await Payment.findOne({ orderRef, candidateId: candidate._id });
    if (!payment) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }

    const client = getClient();
    if (client) payment = await reconcileWithProvider(client, payment);

    const stale = payment.status === 'created' && Date.now() - new Date(payment.createdAt).getTime() > EXPIRE_AFTER_MS;
    const paid = payment.status === 'succeeded';
    res.json({
      success: true,
      status: stale ? 'expired' : payment.status,
      itemType: payment.itemType,
      itemName: payment.itemName,
      amount: (paid && payment.amount != null ? payment.amount : payment.expectedAmount ?? payment.amount ?? 0) / 100,
      currency: (paid && payment.currency) || payment.expectedCurrency || payment.currency || '',
    });
  } catch (error) {
    console.error('[Payments] Status error:', error);
    res.status(500).json({ success: false, error: 'Unable to check payment status.' });
  }
});

paymentsRouter.get('/admin', requireAdminAuth, async (_req: Request, res: Response) => {
  const items = await Payment.find()
    .select('-processedWebhookIds')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, items });
});

export async function paymentsWebhookHandler(req: Request, res: Response) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!getClient() || !secret) {
    res.status(503).json({ success: false, error: 'Webhook not configured.' });
    return;
  }

  const signature = String(req.headers['x-razorpay-signature'] || '');
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (!signature || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn('[Razorpay] Webhook signature verification failed.');
    res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
    return;
  }

  try {
    const event = raw ? JSON.parse(raw) : {};
    const type = String(event.event || '');
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity || {};
    const webhookId = String(req.headers['x-razorpay-event-id'] || event.id || `${type}:${entity.id || ''}`);

    if (type !== 'payment.captured' && type !== 'payment.failed' && type !== 'order.paid') {
      res.json({ success: true, ignored: true });
      return;
    }

    const orderId = entity.order_id || entity.id;
    const orderRef = entity.notes?.orderRef;
    const payment = await Payment.findOne(
      orderRef && ORDER_REF_RE.test(String(orderRef))
        ? { orderRef }
        : orderId
        ? { razorpayOrderId: orderId }
        : { _id: null }
    );

    if (!payment) {
      console.warn('[Razorpay] Webhook for unknown order; acknowledged.');
      res.json({ success: true, ignored: true });
      return;
    }

    if (type === 'payment.failed') {
      await applyTransition(
        payment._id,
        'failed',
        { amount: entity.amount, currency: entity.currency, payment_id: entity.id },
        type,
        webhookId
      );
    } else {
      const remote = type === 'order.paid' && event.payload?.payment?.entity ? event.payload.payment.entity : entity;
      if (remote.status === 'captured' || type === 'order.paid' || type === 'payment.captured') {
        await markCaptured(payment, { ...remote, notes: remote.notes || entity.notes }, webhookId, type);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Razorpay] Webhook processing error:', error);
    res.status(500).json({ success: false });
  }
}
