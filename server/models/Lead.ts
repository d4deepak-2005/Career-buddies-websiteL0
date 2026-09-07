import mongoose from 'mongoose';

const leadNoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, required: true }
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    currentRole: { type: String, default: 'Professional', trim: true },
    experience: { type: String, default: 'Not specified', trim: true },
    industry: { type: String, default: 'Technology', trim: true },
    requirement: { type: String, required: true, trim: true },
    planInterest: { type: String, default: 'General Counselling', trim: true },
    source: { type: String, required: true, trim: true },
    notes: { type: [leadNoteSchema], default: [] },
    alternateNumber: { type: String, trim: true },
    alternateEmail: { type: String, trim: true, lowercase: true },
    linkedinUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'scheduled', 'converted'],
      default: 'new'
    }
  },
  {
    timestamps: true
  }
);

export const Lead =
  mongoose.models.Lead || mongoose.model('Lead', leadSchema);
