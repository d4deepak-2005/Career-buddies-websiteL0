import mongoose from 'mongoose';

const planFeatureSchema = new mongoose.Schema(
  { title: String, included: { type: Boolean, default: true }, detail: String },
  { _id: false }
);

// Field set matches what PlansScreen.tsx actually renders (dual currency,
// structured features with an included/excluded flag, custom-pricing mode).
const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: '' },
    priceINR: { type: String, default: '' },
    priceUSD: { type: String, default: '' },
    period: { type: String, default: '' },
    description: { type: String, default: '' },
    sessionsCount: { type: String, default: '' },
    supportType: { type: String, default: '' },
    bestFor: { type: String, default: '' },
    isRecommended: { type: Boolean, default: false },
    isCustomPricing: { type: Boolean, default: false },
    customPricingNote: { type: String, default: '' },
    badge: { type: String, default: '' },
    features: { type: [planFeatureSchema], default: [] },
    ctaText: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Plan: mongoose.Model<any> =
  mongoose.models.Plan || mongoose.model('Plan', planSchema);
