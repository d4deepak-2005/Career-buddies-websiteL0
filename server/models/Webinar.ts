import mongoose from 'mongoose';

// Field set matches what WebinarsScreen.tsx actually renders (category
// drives its filter, speaker* fields populate its speaker card).
const webinarSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    speakerName: { type: String, default: '', trim: true },
    speakerDesignation: { type: String, default: '' },
    speakerCompany: { type: String, default: '' },
    speakerPhotoUrl: { type: String, default: '' },
    speakerBio: { type: String, default: '' },
    whatYouWillLearn: { type: [String], default: [] },
    targetAudience: { type: [String], default: [] },
    originalPriceINR: { type: Number },
    capacity: { type: Number, default: 0 },
    registeredCount: { type: Number, default: 0 },
    recordingIncluded: { type: Boolean, default: true },
    certificateProvided: { type: Boolean, default: true },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    duration: { type: String, default: '' },
    registrationLink: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    priceINR: { type: Number, default: 0 },
    status: { type: String, default: 'upcoming' },
    featured: { type: Boolean, default: false },
    // Dodo Payments product id used for online checkout (optional)
    dodoProductId: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Webinar: mongoose.Model<any> =
  mongoose.models.Webinar || mongoose.model('Webinar', webinarSchema);
