import mongoose from 'mongoose';

// A registered candidate account (Login / Sign Up). Only the fields the
// Candidate Area actually shows/edits. The password is stored as a scrypt hash.
const candidateSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Bumped on logout / password change so previously issued tokens stop working.
    tokenVersion: { type: Number, default: 0, select: false },
    // True once a social provider has proven the address. Password sign-ups are unverified.
    emailVerified: { type: Boolean, default: false },
    // Linked social logins (Google / LinkedIn / Microsoft / Facebook), keyed by the provider's stable user id.
    identities: {
      type: [{ provider: { type: String, required: true }, subject: { type: String, required: true }, _id: false }],
      default: [],
    },
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

candidateSchema.index({ 'identities.provider': 1, 'identities.subject': 1 });

export const Candidate: mongoose.Model<any> =
  mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
