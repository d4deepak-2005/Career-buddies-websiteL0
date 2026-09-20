import mongoose from 'mongoose';

const curriculumItemSchema = new mongoose.Schema(
  { week: String, topic: String, description: String },
  { _id: false }
);

// Field set matches what ProgrammesScreen.tsx actually renders (category
// drives its filter, mentor* fields populate its "Lead Mentor" card, etc.)
// so the public page can be wired without changing its layout.
const programmeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    institution: { type: String, default: '', trim: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    category: { type: String, default: '' },
    duration: { type: String, default: '' },
    eligibility: { type: String, default: '' },
    curriculum: { type: [curriculumItemSchema], default: [] },
    highlights: { type: [String], default: [] },
    feeINR: { type: Number, default: 0 },
    originalFeeINR: { type: Number },
    mentorName: { type: String, default: '' },
    mentorRole: { type: String, default: '' },
    mentorCompany: { type: String, default: '' },
    mentorAvatar: { type: String, default: '' },
    cohortStartDate: { type: String, default: '' },
    badge: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
    brochureUrl: { type: String, default: '' },
    status: { type: String, default: 'active' },
    featured: { type: Boolean, default: false },
    // Dodo Payments product id used for online checkout (optional)
    dodoProductId: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Programme: mongoose.Model<any> =
  mongoose.models.Programme || mongoose.model('Programme', programmeSchema);
