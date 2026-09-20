import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    id: String,
    author: String,
    role: String,
    rating: { type: Number, default: 5 },
    date: String,
    comment: String,
  },
  { _id: false }
);

// Every field the public mentor pages (directory cards, profile modal,
// booking, smart-match) display, so the whole mentor experience is CMS-driven.
const mentorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: '' },
    designation: { type: String, default: '', trim: true },
    company: { type: String, default: '', trim: true },
    companyColor: { type: String, default: '' },
    category: { type: String, default: '' },
    bio: { type: String, default: '' },
    longBio: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    expertise: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    pastCompanies: { type: [String], default: [] },
    linkedIn: { type: String, default: '' },
    rating: { type: Number, default: 5 },
    reviewCount: { type: Number, default: 0 },
    sessionsCompleted: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    availableNext: { type: String, default: '' },
    verified: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    superMentor: { type: Boolean, default: false },
    reviews: { type: [reviewSchema], default: [] },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Mentor: mongoose.Model<any> =
  mongoose.models.Mentor || mongoose.model('Mentor', mentorSchema);
