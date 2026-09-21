import mongoose from 'mongoose';

// One document per checkout attempt. `status` is driven by verified Dodo
// Payments webhooks (never by the browser), and `processedWebhookIds` makes
// webhook handling idempotent (Dodo retries deliveries).
const paymentSchema = new mongoose.Schema(
  {
    orderRef: { type: String, required: true, unique: true, index: true },
    itemType: { type: String, enum: ['webinar', 'plan', 'programme'], required: true },
    itemId: { type: String, default: '' },
    itemName: { type: String, default: '' },
    provider: { type: String, default: 'dodo' },
    productId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['created', 'processing', 'succeeded', 'failed', 'cancelled', 'expired'],
      default: 'created',
    },
    // Amount/currency the server verified (Dodo product vs CMS) before creating the checkout, in minor units.
    expectedAmount: { type: Number },
    expectedCurrency: { type: String, default: '' },
    // Amount/currency actually reported by Dodo's verified webhook / API.
    amount: { type: Number },
    currency: { type: String, default: '' },
    amountMismatch: { type: Boolean, default: false },
    // The authenticated candidate this checkout belongs to (taken from the server session, never from the browser).
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', index: true },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    dodoSessionId: { type: String, default: '', index: true },
    checkoutUrl: { type: String, default: '' },
    // Set only while this candidate has an unfinished checkout for the item (makes a repeat click reuse it).
    openKey: { type: String },
    lastProviderCheckAt: { type: Date },
    dodoPaymentId: { type: String, default: '' },
    lastEventType: { type: String, default: '' },
    lastEventAt: { type: Date },
    failureReason: { type: String, default: '' },
    processedWebhookIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Admin payment list is sorted newest-first.
paymentSchema.index({ createdAt: -1 });
// At most one unfinished checkout per candidate + item.
paymentSchema.index({ openKey: 1 }, { unique: true, partialFilterExpression: { openKey: { $type: 'string' } } });

export const Payment: mongoose.Model<any> =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
