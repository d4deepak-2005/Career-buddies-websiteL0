import mongoose from 'mongoose';

// A registered candidate account (Login / Sign Up). Only the fields the
// Candidate Area actually shows/edits. The password is stored as a scrypt hash.
const candidateSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Bumped on logout / password change so previously issued tokens stop working.
    tokenVersion: { type: Number, default: 0, select: false },
    accountType: { type: String, enum: ['mentee', 'mentor'], default: 'mentee' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    mobile: { type: String, default: '', trim: true },
    alternateNumber: { type: String, default: '', trim: true },
    alternateEmail: { type: String, default: '', trim: true, lowercase: true },
    currentDesignation: { type: String, default: '', trim: true },
    totalExperience: { type: String, default: '', trim: true },
    targetRole: { type: String, default: '', trim: true },
    linkedinUrl: { type: String, default: '', trim: true },
    portfolioUrl: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export const Candidate: mongoose.Model<any> =
  mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
