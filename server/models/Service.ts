import mongoose from 'mongoose';

// Field set matches what ServicesScreen.tsx actually renders (category
// drives its filter; iconName drives its existing lucide-icon switch,
// iconUrl is the new admin-editable image override — if set, the public
// screen shows that image instead of the icon-by-name).
const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, default: '' },
    fullDescription: { type: String, default: '' },
    category: { type: String, default: '' },
    iconName: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    deliverables: { type: [String], default: [] },
    idealFor: { type: [String], default: [] },
    keyOutcome: { type: String, default: '' },
    duration: { type: String, default: '' },
    badge: { type: String, default: '' },
    ctaText: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Service: mongoose.Model<any> =
  mongoose.models.Service || mongoose.model('Service', serviceSchema);
