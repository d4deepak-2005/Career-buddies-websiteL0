import mongoose from 'mongoose';

const navItemSchema = new mongoose.Schema(
  {
    label: String,
    page: String,
    enabled: { type: Boolean, default: true },
    placement: { type: String, enum: ['top', 'more'], default: 'top' },
  },
  { _id: false }
);

const statItemSchema = new mongoose.Schema(
  { label: String, value: String, badge: String },
  { _id: false }
);

const journeyStageSchema = new mongoose.Schema(
  { title: String, badge: String, desc: String },
  { _id: false }
);

const valueItemSchema = new mongoose.Schema(
  { title: String, description: String },
  { _id: false }
);

const faqItemSchema = new mongoose.Schema(
  { question: String, answer: String },
  { _id: false }
);

const nextStepCardSchema = new mongoose.Schema(
  {
    title: String,
    subtitle: String,
    description: String,
    ctaText: String,
    targetPage: String,
    badge: String,
    color: String,
  },
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
      webinarEntryPriceINR: { type: Number, default: 199 },
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
      nextStepEyebrow: { type: String, default: '' },
      nextStepTitle: { type: String, default: '' },
      nextStepDescription: { type: String, default: '' },
      nextStepCtaText: { type: String, default: '' },
      nextStepCtaPage: { type: String, default: '' },
      nextStepCards: { type: [nextStepCardSchema], default: [] },
      journeyEyebrow: { type: String, default: '' },
      journeyTitle: { type: String, default: '' },
      journeyDescription: { type: String, default: '' },
      journeyCtaEyebrow: { type: String, default: '' },
      journeyCtaTitle: { type: String, default: '' },
      journeyCtaDescription: { type: String, default: '' },
      journeyMoreText: { type: String, default: '' },
      journeyStages: { type: [journeyStageSchema], default: [] },
      trustEyebrow: { type: String, default: '' },
      trustTitle: { type: String, default: '' },
      trustDescription: { type: String, default: '' },
      trustPoints: { type: [valueItemSchema], default: [] },
      trustCommitmentTitle: { type: String, default: '' },
      trustCommitmentDescription: { type: String, default: '' },
      trustCommitmentNote: { type: String, default: '' },
      faqEyebrow: { type: String, default: '' },
      faqTitle: { type: String, default: '' },
      faqDescription: { type: String, default: '' },
      faqItems: { type: [faqItemSchema], default: [] },
      servicesEyebrow: { type: String, default: '' },
      servicesTitle: { type: String, default: '' },
      servicesDescription: { type: String, default: '' },
      masterclassesEyebrow: { type: String, default: '' },
      masterclassesTitle: { type: String, default: '' },
      masterclassesDescription: { type: String, default: '' },
      masterclassesButtonText: { type: String, default: '' },
      checkInEyebrow: { type: String, default: '' },
      checkInTitle: { type: String, default: '' },
      checkInDescription: { type: String, default: '' },
      checkInButtonText: { type: String, default: '' },
      sectionVisibility: { type: mongoose.Schema.Types.Mixed, default: {} },
      homeHtml: { type: mongoose.Schema.Types.Mixed, default: {} },
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
    maintenance: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: '' },
      message: { type: String, default: '' },
      eta: { type: String, default: '' },
    },
    resources: {
      heading: { type: String, default: '' },
      subtitle: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const SiteSettings: mongoose.Model<any> = (() => {
  if (mongoose.models.SiteSettings) {
    mongoose.deleteModel('SiteSettings');
  }
  return mongoose.model('SiteSettings', siteSettingsSchema);
})();
