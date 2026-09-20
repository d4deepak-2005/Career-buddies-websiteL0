import mongoose from 'mongoose';

// Consolidates Founder/Co-Founder/Leadership content, which today exists as
// three separate, inconsistent duplicates across src/config/leadership.ts,
// src/config/leadershipData.ts and src/data/mockData.ts. `role` distinguishes
// the Founder & Co-Founder and Leadership Site Settings tabs from one source.
const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    role: {
      type: String,
      enum: ['founder', 'co-founder', 'leadership'],
      required: true,
    },
    title: { type: String, default: '', trim: true },
    // e.g. "10+ Years of Professional Experience" — shown as a badge on the
    // public leadership card. Optional so the public UI keeps working if unset.
    yearsOfExperience: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    shortBio: { type: String, default: '' },
    longBio: { type: String, default: '' },
    email: { type: String, default: '', trim: true },
    linkedIn: { type: String, default: '' },
    expertise: { type: [String], default: [] },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Person: mongoose.Model<any> =
  mongoose.models.Person || mongoose.model('Person', personSchema);
