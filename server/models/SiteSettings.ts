import mongoose from 'mongoose';

const navItemSchema = new mongoose.Schema(
  { label: String, page: String },
  { _id: false }
);

const statItemSchema = new mongoose.Schema(
  { label: String, value: String },
  { _id: false }
);

const valueItemSchema = new mongoose.Schema(
  { title: String, description: String },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  { platform: String, url: String },
  { _id: false }
);

// Singleton document — a single SiteSettings row holds every "one value at a
// time" section (General/Header/Home/About/Footer/Contact/SEO). Repeatable
// content (mentors, programmes, etc.) lives in its own collection instead.
const siteSettingsSchema = new mongoose.Schema(
  {
    general: {
      brandName: { type: String, default: 'CareerBuddies' },
      primaryColor: { type: String, default: '#002869' },
      secondaryColor: { type: String, default: '#006e29' },
      whatsappNumber: { type: String, default: '' },
      supportEmail: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    header: {
      // Defaults to the existing original logo asset already used site-wide.
      logoUrl: { type: String, default: '/logo.png' },
      navItems: { type: [navItemSchema], default: [] },
      ctaText: { type: String, default: '' },
      ctaLink: { type: String, default: '' },
      announcementText: { type: String, default: '' },
      announcementVisible: { type: Boolean, default: false },
    },
    home: {
      heroTitle: { type: String, default: '' },
      heroSubtitle: { type: String, default: '' },
      heroDescription: { type: String, default: '' },
      heroCtaText: { type: String, default: '' },
      heroImageUrl: { type: String, default: '' },
      stats: { type: [statItemSchema], default: [] },
    },
    about: {
      title: { type: String, default: '' },
      mission: { type: String, default: '' },
      vision: { type: String, default: '' },
      values: { type: [valueItemSchema], default: [] },
    },
    footer: {
      description: { type: String, default: '' },
      socialLinks: { type: [socialLinkSchema], default: [] },
      copyrightText: { type: String, default: '' },
    },
    contact: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      mapEmbedUrl: { type: String, default: '' },
    },
    seo: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      ogImageUrl: { type: String, default: '' },
      faviconUrl: { type: String, default: '' },
      analyticsId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const SiteSettings: mongoose.Model<any> =
  mongoose.models.SiteSettings ||
  mongoose.model('SiteSettings', siteSettingsSchema);
