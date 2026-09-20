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
    productId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['created', 'processing', 'succeeded', 'failed', 'cancelled'],
      default: 'created',
    },
    amount: { type: Number },
    currency: { type: String, default: '' },
    // The authenticated candidate this checkout belongs to (taken from the server session, never from the browser).
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', index: true },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    dodoSessionId: { type: String, default: '', index: true },
    dodoPaymentId: { type: String, default: '' },
    lastEventType: { type: String, default: '' },
    lastEventAt: { type: Date },
    failureReason: { type: String, default: '' },
    processedWebhookIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Payment: mongoose.Model<any> =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
