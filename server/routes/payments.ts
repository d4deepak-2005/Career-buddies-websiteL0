import crypto from 'crypto';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import DodoPayments from 'dodopayments';
import { Payment } from '../models/Payment.ts';
import { Webinar } from '../models/Webinar.ts';
import { Plan } from '../models/Plan.ts';
import { Programme } from '../models/Programme.ts';
import { getPublicBaseUrl } from '../config/baseUrl.ts';
import { requireCandidateAuth } from '../middleware/candidateAuth.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';

// Dodo Payments integration.
//   API:      https://docs.dodopayments.com/api-reference/checkout-sessions/create
//   Webhooks: https://docs.dodopayments.com/developer-resources/webhooks
// Secrets come only from environment variables — never from the frontend.

const MODELS: Record<string, mongoose.Model<any>> = {
  webinar: Webinar,
  plan: Plan,
  programme: Programme,
};

let cachedClient: DodoPayments | null = null;

function getClient(): DodoPayments | null {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) return null;

  // TEST MODE ONLY unless live mode has been deliberately enabled (never done in development).
  const wantsLive = process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode';
  if (wantsLive && process.env.DODO_PAYMENTS_ALLOW_LIVE_MODE !== 'true') {
    console.error('[Dodo] live_mode requested but not allowed; payments are disabled. Use test_mode.');
    return null;
  }

  if (!cachedClient) {
    // A bad configuration must never crash the process: treat it as "not configured".
    try {
      cachedClient = new DodoPayments({
        bearerToken: apiKey,
        environment: wantsLive ? 'live_mode' : 'test_mode',
        webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || null,
      });
    } catch (error: any) {
      console.error('[Dodo] Invalid payment configuration; payments are disabled.');
      return null;
    }
  }

  return cachedClient;
}

// Return/cancel URLs come only from the configured public base URL (never request headers).
function getAppUrl(req: Request): string | null {
  return getPublicBaseUrl(req);
}

// Extra checkout notes from the form: plain strings only, small, never trusted for anything.
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

const OPEN_REUSE_MS = 30 * 60 * 1000; // a repeat click within this window reuses the unfinished checkout
const EXPIRE_AFTER_MS = 60 * 60 * 1000; // an unpaid checkout older than this is shown as expired
const RECONCILE_MIN_MS = 15 * 1000; // at most one provider lookup per payment per interval
const TERMINAL = ['succeeded', 'failed', 'cancelled'];

// ---- Price resolution: the CMS decides what is sold, Dodo's product must agree -------------------------

// CMS prices are rupees (number, or a display string such as "₹4,999"); returns paise, or 0 if not a usable price.
function cmsMinorAmount(itemType: string, record: any): number {
  const raw = itemType === 'webinar' ? record.priceINR : itemType === 'programme' ? record.feeINR : record.priceINR;
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

type Verified = { ok: true; amount: number; currency: string } | { ok: false; reason: string };
const verifyCache = new Map<string, { at: number; result: Verified }>();

// Confirms the Dodo product is a plain one-time product whose real price and currency equal the CMS price,
// so the amount shown to the candidate is the amount Dodo will charge.
async function verifyProductPrice(client: DodoPayments, productId: string, cmsAmount: number): Promise<Verified> {
  if (!cmsAmount) return { ok: false, reason: 'cms_price_missing' };
  const key = `${productId}:${cmsAmount}`;
  const hit = verifyCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.result;

  let result: Verified;
  try {
    const product: any = await client.products.retrieve(productId);
    const price: any = product?.price;
    if (product?.is_recurring || price?.type !== 'one_time_price' || price?.pay_what_you_want) {
      result = { ok: false, reason: 'product_not_fixed_one_time' };
    } else {
      const bps = Number(price.discount_bps) || 0;
      const amount = Math.round(Number(price.price) * (10000 - bps) / 10000);
      const currency = String(price.currency || '');
      if (currency !== 'INR') result = { ok: false, reason: `currency_mismatch:${currency}` };
      else if (amount !== cmsAmount) result = { ok: false, reason: 'amount_mismatch' };
      else result = { ok: true, amount, currency };
    }
  } catch (error: any) {
    // Not cached: a network/Dodo failure is transient.
    console.error('[Dodo] Product lookup failed:', error?.status, error?.message);
    return { ok: false, reason: 'product_lookup_failed' };
  }
  verifyCache.set(key, { at: Date.now(), result });
  return result;
}

type Resolved =
  | { ok: true; record: any; productId: string; label: string; cmsAmount: number }
  | { ok: false; status: number; error: string };

// A purchasable item must exist in the CMS, be visible, and have a Dodo product.
async function resolveItem(itemType: any, itemId: any): Promise<Resolved> {
  if (typeof itemType !== 'string' || !Object.prototype.hasOwnProperty.call(MODELS, itemType)) {
    return { ok: false, status: 400, error: 'Invalid item type.' };
  }
  let record: any = null;
  if (typeof itemId === 'string' && mongoose.isValidObjectId(itemId)) {
    record = await MODELS[itemType].findOne({ _id: itemId, visible: { $ne: false } });
  }
  if (!record) return { ok: false, status: 404, error: 'This item is not available.' };

  const productId: string =
    record.dodoProductId || (itemType === 'webinar' ? process.env.DODO_PRODUCT_ID_WEBINAR || '' : '');
  if (!productId) {
    return { ok: false, status: 400, error: 'Online payment is currently unavailable for this item.' };
  }
  return {
    ok: true,
    record,
    productId,
    label: String(record.title || record.name || itemType).slice(0, 200),
    cmsAmount: cmsMinorAmount(itemType, record),
  };
}

const UNAVAILABLE = 'Online payment is currently unavailable for this item.';

export const paymentsRouter = express.Router();

// What the candidate will be charged, from the server, before anything is created or redirected.
paymentsRouter.post('/quote', requireCandidateAuth, async (req: Request, res: Response) => {
  const client = getClient();
  if (!client) {
    res.status(503).json({ success: false, error: 'Online payments are not configured yet. Please contact CareerBuddies.' });
    return;
  }
  try {
    const item = await resolveItem(req.body?.itemType, req.body?.itemId);
    if (item.ok === false) {
      res.status(item.status).json({ success: false, error: item.error });
      return;
    }
    const verified = await verifyProductPrice(client, item.productId, item.cmsAmount);
    if (verified.ok === false) {
      console.error('[Payments] Quote unavailable:', verified.reason);
      res.status(409).json({ success: false, error: UNAVAILABLE });
      return;
    }
    res.json({
      success: true,
      itemName: item.label,
      amount: verified.amount / 100,
      currency: verified.currency,
      testMode: process.env.DODO_PAYMENTS_ENVIRONMENT !== 'live_mode',
    });
  } catch (error) {
    console.error('[Payments] Quote error:', error);
    res.status(500).json({ success: false, error: 'Unable to load payment details.' });
  }
});

// Create a Dodo checkout session for a webinar / plan / programme.
// The price is defined by the Dodo product — the browser never sends an amount.
paymentsRouter.post('/checkout', requireCandidateAuth, async (req: Request, res: Response) => {
  const client = getClient();

  if (!client) {
    res.status(503).json({
      success: false,
      error: 'Online payments are not configured yet. Please contact CareerBuddies.',
    });
    return;
  }

  // Only the item type + id are used to pick what is bought. Price, currency, product id and
  // candidate identity are never read from the request.
  const { itemType, itemId, customer, details } = req.body || {};
  // Identity comes ONLY from the authenticated server session. Any customer id/email
  // in the request body is ignored - it can't associate a checkout with someone else.
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
    const { record, productId, label } = item;

    const appUrl = getAppUrl(req);
    if (!appUrl) {
      console.error('[Payments] PUBLIC_BASE_URL is not configured; checkout is unavailable.');
      res.status(503).json({
        success: false,
        error: 'Online payments are temporarily unavailable. Please contact CareerBuddies.',
      });
      return;
    }

    // Duplicate-click safety: one unfinished checkout per candidate + item.
    const openKey = `${candidate._id}:${itemType}:${record._id}`;
    const reuse = async (): Promise<boolean> => {
      const existing = await Payment.findOne({ openKey });
      if (!existing) return false;
      const fresh = Date.now() - new Date(existing.createdAt).getTime() < OPEN_REUSE_MS;
      if (fresh && existing.status === 'processing') {
        res.json({ success: true, orderRef: existing.orderRef, checkoutUrl: null, alreadyProcessing: true });
        return true;
      }
      if (fresh && existing.status === 'created' && /^https:\/\//.test(existing.checkoutUrl || '')) {
        res.json({ success: true, orderRef: existing.orderRef, checkoutUrl: existing.checkoutUrl, reused: true });
        return true;
      }
      // Stale (or never got a session): release it so a new checkout can start.
      await Payment.updateOne({ _id: existing._id, openKey }, { $unset: { openKey: 1 } });
      return false;
    };
    if (await reuse()) return;

    const verified = await verifyProductPrice(client, productId, item.cmsAmount);
    if (verified.ok === false) {
      console.error('[Payments] Checkout blocked, price not verified:', verified.reason);
      res.status(409).json({ success: false, error: UNAVAILABLE });
      return;
    }

    const orderRef = crypto.randomBytes(9).toString('hex');
    let payment: any;
    try {
      payment = await Payment.create({
        orderRef,
        itemType,
        itemId: String(record._id),
        itemName: label,
        productId,
        expectedAmount: verified.amount,
        expectedCurrency: verified.currency,
        openKey,
        candidateId: candidate._id,
        customerName: name,
        customerEmail: email,
        customerMobile: mobile,
        details: safeDetails(details),
      });
    } catch (error: any) {
      if (error?.code === 11000 && (await reuse())) return; // concurrent double-click: hand back the winner
      throw error;
    }

    try {
      const session = await client.checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email, name },
        return_url: `${appUrl}/?order=${orderRef}`,
        cancel_url: `${appUrl}/?order=${orderRef}&cancelled=1`,
        metadata: { orderRef, itemType, itemId: String(record._id) },
      });

      if (!session?.session_id || !/^https:\/\//.test(String(session.checkout_url || ''))) throw new Error('bad_session');
      payment.dodoSessionId = session.session_id;
      payment.checkoutUrl = session.checkout_url;
      await payment.save();

      res.status(201).json({
        success: true,
        orderRef,
        checkoutUrl: session.checkout_url,
      });
    } catch (dodoError: any) {
      console.error('[Dodo] Checkout session creation failed:', dodoError?.status, dodoError?.message);
      payment.status = 'failed';
      payment.failureReason = 'checkout_creation_failed';
      payment.openKey = undefined;
      await payment.save();
      res.status(502).json({
        success: false,
        error: 'Unable to start payment right now. Please try again shortly.',
      });
    }
  } catch (error) {
    console.error('[Payments] Checkout error:', error);
    res.status(500).json({ success: false, error: 'Unable to start payment.' });
  }
});

const EVENT_STATUS: Record<string, string> = {
  'payment.succeeded': 'succeeded',
  'payment.failed': 'failed',
  'payment.cancelled': 'cancelled',
  'payment.processing': 'processing',
};

// Dodo's payment status → ours. Anything else (requires_*) means "still pending".
const INTENT_STATUS: Record<string, string> = {
  succeeded: 'succeeded',
  failed: 'failed',
  cancelled: 'cancelled',
  processing: 'processing',
};

// A payment never moves backwards (e.g. a late "processing" cannot undo "succeeded").
const RANK: Record<string, number> = {
  created: 0,
  processing: 1,
  failed: 2,
  cancelled: 2,
  expired: 0,
  succeeded: 3,
};

// The single place a payment's status changes. `changeId` (a webhook-id, or a synthetic id for provider lookups)
// makes it idempotent; the update is one atomic, forward-only pipeline.
async function applyTransition(
  paymentId: any,
  newStatus: string,
  data: any,
  eventType: string,
  changeId: string
): Promise<any | null> {
  const allowedPrev = Object.keys(RANK).filter((s) => RANK[s] <= RANK[newStatus]);
  const canApply = { $in: ['$status', allowedPrev] };
  const total = Number(data.total_amount ?? data.settlement_amount ?? 0);
  const currency = String(data.currency || '');

  const set: Record<string, any> = {
    processedWebhookIds: { $concatArrays: [{ $ifNull: ['$processedWebhookIds', []] }, [changeId]] },
    status: { $cond: [canApply, newStatus, '$status'] },
    dodoPaymentId: { $cond: [canApply, { $literal: String(data.payment_id || '') }, '$dodoPaymentId'] },
    amount: { $cond: [canApply, { $literal: total }, '$amount'] },
    currency: { $cond: [canApply, { $literal: currency }, '$currency'] },
    lastEventType: { $literal: eventType },
    lastEventAt: '$$NOW',
  };
  if (newStatus === 'succeeded') {
    // Flag (never hide) a paid amount that differs from what the server verified at checkout.
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
    // A finished checkout no longer blocks the candidate from starting another.
    set.openKey = { $cond: [canApply, '$$REMOVE', '$openKey'] };
  }
  if (newStatus === 'failed') {
    set.failureReason = { $cond: [canApply, { $literal: String(data.error_code || data.error_message || 'payment_failed').slice(0, 200) }, '$failureReason'] };
  }

  const updated = await Payment.findOneAndUpdate(
    { _id: paymentId, processedWebhookIds: { $ne: changeId } },
    [{ $set: set }],
    { returnDocument: 'after', updatePipeline: true }
  );
  if (updated?.amountMismatch && newStatus === 'succeeded') {
    console.error(`[Payments] Paid amount differs from the verified amount for order ${updated.orderRef}; flagged for review.`);
  }
  return updated;
}

// Webhook delayed or lost? Ask Dodo directly (session → payment) and apply the result through the same
// idempotent transition. Only trusts a payment whose metadata carries this order's reference.
async function reconcileWithProvider(client: DodoPayments, payment: any): Promise<any> {
  if (!payment.dodoSessionId || !['created', 'processing'].includes(payment.status)) return payment;
  if (payment.lastProviderCheckAt && Date.now() - new Date(payment.lastProviderCheckAt).getTime() < RECONCILE_MIN_MS) return payment;
  await Payment.updateOne({ _id: payment._id }, { $set: { lastProviderCheckAt: new Date() } });
  try {
    const session: any = await client.checkoutSessions.retrieve(payment.dodoSessionId);
    if (!session?.payment_id) return payment;
    const remote: any = await client.payments.retrieve(session.payment_id);
    if (!remote || remote.metadata?.orderRef !== payment.orderRef) {
      console.warn('[Dodo] Provider payment does not belong to this order; ignored.');
      return payment;
    }
    const mapped = INTENT_STATUS[String(remote.status)];
    if (!mapped) return payment;
    const updated = await applyTransition(payment._id, mapped, remote, `sync.${mapped}`, `sync:${remote.payment_id}:${mapped}`);
    return updated || (await Payment.findById(payment._id)) || payment;
  } catch (error: any) {
    console.warn('[Dodo] Provider status lookup failed:', error?.status, error?.message);
    return payment;
  }
}

// Status for the return page. Only the candidate who started the checkout can read it.
paymentsRouter.get('/status/:orderRef', requireCandidateAuth, async (req: Request, res: Response) => {
  const { orderRef } = req.params;

  if (!ORDER_REF_RE.test(orderRef)) {
    res.status(400).json({ success: false, error: 'Invalid order reference.' });
    return;
  }

  try {
    const candidate = (req as any).candidate;
    // Someone else's order is indistinguishable from a missing one.
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

// Admin-only payment log.
paymentsRouter.get('/admin', requireAdminAuth, async (req: Request, res: Response) => {
  const items = await Payment.find()
    .select('-processedWebhookIds')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, items });
});

// Mounted with express.raw() BEFORE express.json() — signature verification
// needs the exact raw request body.
export async function paymentsWebhookHandler(req: Request, res: Response) {
  const client = getClient();

  if (!client || !process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    res.status(503).json({ success: false, error: 'Webhook not configured.' });
    return;
  }

  const webhookId = String(req.headers['webhook-id'] || '');
  let event: any;

  try {
    event = client.webhooks.unwrap(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '', {
      headers: {
        'webhook-id': webhookId,
        'webhook-signature': String(req.headers['webhook-signature'] || ''),
        'webhook-timestamp': String(req.headers['webhook-timestamp'] || ''),
      },
    });
  } catch (error) {
    console.warn('[Dodo] Webhook signature verification failed.');
    res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
    return;
  }

  try {
    const newStatus = EVENT_STATUS[event?.type];

    // Unrelated event types are acknowledged so Dodo doesn't retry them.
    if (!newStatus || !webhookId) {
      res.json({ success: true, ignored: true });
      return;
    }

    const data = event.data || {};
    const orderRef = data.metadata?.orderRef;
    const sessionId = data.checkout_session_id;

    const payment = await Payment.findOne(
      orderRef && ORDER_REF_RE.test(String(orderRef))
        ? { orderRef }
        : sessionId
        ? { dodoSessionId: sessionId }
        : { _id: null }
    );

    if (!payment) {
      console.warn('[Dodo] Webhook for unknown order; acknowledged.');
      res.json({ success: true, ignored: true });
      return;
    }

    // Duplicate deliveries (same webhook-id) are no-ops; out-of-order ones never move the status backwards.
    const updated = await applyTransition(payment._id, newStatus, data, String(event.type), webhookId);

    res.json({ success: true, duplicate: !updated });
  } catch (error) {
    console.error('[Dodo] Webhook processing error:', error);
    // Non-2xx makes Dodo retry delivery.
    res.status(500).json({ success: false });
  }
}
