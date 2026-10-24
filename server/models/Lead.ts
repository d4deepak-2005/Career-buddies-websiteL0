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
    // Optional: some forms don't collect an email, and none is invented for them.
    email: { type: String, default: '', trim: true, lowercase: true, index: true },
    // Set when the enquiry was created by a logged-in candidate (used to show them their own history).
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', index: true },
    // Set when the lead is a 1:1 mentor personal session booking
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', index: true, default: null },
    mentorName: { type: String, trim: true, default: '' },
    bookingDate: { type: String, trim: true, default: '' },
    bookingSlot: { type: String, trim: true, default: '' },
    bookingTopic: { type: String, trim: true, default: '' },
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
      enum: ['new', 'contacted', 'scheduled', 'converted', 'cancelled'],
      default: 'new'
    }
  },
  {
    timestamps: true
  }
);

// Admin list sorts by createdAt and the lead serial number counts leads up to a createdAt.
leadSchema.index({ createdAt: 1 });

export const Lead: mongoose.Model<any> =
  mongoose.models.Lead || mongoose.model('Lead', leadSchema);
