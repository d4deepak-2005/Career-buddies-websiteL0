import mongoose from 'mongoose';

// Field set matches what SuccessStoriesScreen.tsx actually renders
// (outcomeType drives its filter pills).
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: { type: String, default: '' },
    role: { type: String, default: '', trim: true },
    company: { type: String, default: '', trim: true },
    previousRole: { type: String, default: '' },
    previousCompany: { type: String, default: '' },
    testimonial: { type: String, default: '' },
    outcomeMetric: { type: String, default: '' },
    outcomeType: {
      type: String,
      enum: ['transition', 'promotion', 'clarity', 'hike'],
      default: 'clarity',
    },
    rating: { type: Number, default: 5 },
    mentorName: { type: String, default: '' },
    serviceUsed: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Testimonial: mongoose.Model<any> =
  mongoose.models.Testimonial ||
  mongoose.model('Testimonial', testimonialSchema);
