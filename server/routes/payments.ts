import crypto from 'crypto';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import DodoPayments from 'dodopayments';
import { Payment } from '../models/Payment.ts';
import { Webinar } from '../models/Webinar.ts';
import { Plan } from '../models/Plan.ts';
import { Programme } from '../models/Programme.ts';
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

  if (!cachedClient) {
    cachedClient = new DodoPayments({
      bearerToken: apiKey,
      environment:
        process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
          ? 'live_mode'
          : 'test_mode',
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || null,
    });
  }

  return cachedClient;
}

function getAppUrl(req: Request): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, '');
  // Only trust the request host in development; production must set APP_URL.
  return `${req.protocol}://${req.get('host')}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_REF_RE = /^[a-f0-9]{18}$/;

export const paymentsRouter = express.Router();

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

  const { itemType, itemId, itemName, customer, details } = req.body || {};
  // Identity comes ONLY from the authenticated server session. Any customer id/email
  // in the request body is ignored - it can't associate a checkout with someone else.
  const candidate = (req as any).candidate;
  const name = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim().slice(0, 120);
  const email = String(candidate.email || '').trim().toLowerCase().slice(0, 200);
  const mobile = String(customer?.mobile || candidate.mobile || '').trim().slice(0, 30);

  if (!MODELS[itemType]) {
    res.status(400).json({ success: false, error: 'Invalid item type.' });
    return;
  }
  if (!name || !EMAIL_RE.test(email)) {
    res.status(400).json({ success: false, error: 'A valid name and email are required.' });
    return;
  }

  try {
    // Resolve the Dodo product server-side from the CMS record (admin-set
    // `dodoProductId`); webinars fall back to the standard pass product.
    let record: any = null;
    if (itemId && mongoose.isValidObjectId(itemId)) {
      record = await MODELS[itemType].findOne({ _id: itemId, visible: { $ne: false } });
    }

    const productId: string =
      record?.dodoProductId ||
      (itemType === 'webinar' ? process.env.DODO_PRODUCT_ID_WEBINAR || '' : '');

    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'This item is not available for online payment yet.',
      });
      return;
    }

    const label = String(record?.title || record?.name || itemName || itemType).slice(0, 200);
    const orderRef = crypto.randomBytes(9).toString('hex');
    const appUrl = getAppUrl(req);

    const payment = await Payment.create({
      orderRef,
      itemType,
      itemId: String(itemId || ''),
      itemName: label,
      productId,
      candidateId: candidate._id,
      customerName: name,
      customerEmail: email,
      customerMobile: mobile,
      details: typeof details === 'object' && details ? details : {},
    });

    try {
      const session = await client.checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email, name },
        return_url: `${appUrl}/?order=${orderRef}`,
        cancel_url: `${appUrl}/?order=${orderRef}&cancelled=1`,
        metadata: { orderRef, itemType, itemId: String(itemId || '') },
      });

      payment.dodoSessionId = session.session_id;
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

// Minimal public status lookup for the return page (no personal data).
paymentsRouter.get('/status/:orderRef', async (req: Request, res: Response) => {
  const { orderRef } = req.params;

  if (!ORDER_REF_RE.test(orderRef)) {
    res.status(400).json({ success: false, error: 'Invalid order reference.' });
    return;
  }

  const payment = await Payment.findOne({ orderRef });

  if (!payment) {
    res.status(404).json({ success: false, error: 'Order not found.' });
    return;
  }

  res.json({
    success: true,
    status: payment.status,
    itemType: payment.itemType,
    itemName: payment.itemName,
  });
});

// Admin-only payment log.
paymentsRouter.get('/admin', requireAdminAuth, async (req: Request, res: Response) => {
  const items = await Payment.find()
    .select('-processedWebhookIds')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, items });
});

const EVENT_STATUS: Record<string, string> = {
  'payment.succeeded': 'succeeded',
  'payment.failed': 'failed',
  'payment.cancelled': 'cancelled',
  'payment.processing': 'processing',
};

// A payment never moves backwards (e.g. a late "processing" cannot undo "succeeded").
const RANK: Record<string, number> = {
  created: 0,
  processing: 1,
  failed: 2,
  cancelled: 2,
  succeeded: 3,
};

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

    const allowedPrev = Object.keys(RANK).filter((s) => RANK[s] <= RANK[newStatus]);
    const canApply = { $in: ['$status', allowedPrev] };

    // Single atomic update: skips if this webhook-id was already processed
    // (duplicate delivery) and only advances the status forward.
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, processedWebhookIds: { $ne: webhookId } },
      [
        {
          $set: {
            processedWebhookIds: {
              $concatArrays: [{ $ifNull: ['$processedWebhookIds', []] }, [webhookId]],
            },
            status: { $cond: [canApply, newStatus, '$status'] },
            dodoPaymentId: { $cond: [canApply, { $literal: String(data.payment_id || '') }, '$dodoPaymentId'] },
            amount: { $cond: [canApply, { $literal: Number(data.total_amount ?? data.settlement_amount ?? 0) }, '$amount'] },
            currency: { $cond: [canApply, { $literal: String(data.currency || '') }, '$currency'] },
            lastEventType: { $literal: String(event.type) },
            lastEventAt: '$$NOW',
          },
        },
      ],
      { returnDocument: 'after', updatePipeline: true }
    );

    res.json({ success: true, duplicate: !updated });
  } catch (error) {
    console.error('[Dodo] Webhook processing error:', error);
    // Non-2xx makes Dodo retry delivery.
    res.status(500).json({ success: false });
  }
}
