import mongoose from 'mongoose';

const mentorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: '' },
    designation: { type: String, default: '', trim: true },
    company: { type: String, default: '', trim: true },
    bio: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    expertise: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    linkedIn: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Mentor: mongoose.Model<any> =
  mongoose.models.Mentor || mongoose.model('Mentor', mentorSchema);
