import express, { Request, Response } from 'express';
import { SiteSettings } from '../models/SiteSettings.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { actorFromReq, recordAdminAudit } from '../services/adminAudit.ts';

// Site Settings is a singleton — one document holds every "one value at a
// time" section (General/Header/Home/About/Footer/Contact/SEO). Unlike the
// repeatable collections (mentors, programmes, ...), it has no list/id routes.
const router = express.Router();

const SECTION_KEYS = ['general', 'header', 'home', 'about', 'footer', 'contact', 'seo', 'maintenance', 'resources'] as const;
const NAV_PAGES = new Set([
  'home',
  'services',
  'programmes',
  'career-check-in',
  'how-it-works',
  'webinars',
  'mentors',
  'leadership',
  'success-stories',
  'resources',
  'about-us',
  'contact',
]);

function asString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function pickNavItems(input: unknown) {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const items: { page: string; label: string; enabled: boolean; placement: 'top' | 'more' }[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const page = asString((raw as { page?: unknown }).page, 40);
    if (!NAV_PAGES.has(page) || seen.has(page)) continue;
    seen.add(page);
    items.push({
      page,
      label: asString((raw as { label?: unknown }).label, 60) || page,
      enabled: (raw as { enabled?: unknown }).enabled !== false,
      placement: (raw as { placement?: unknown }).placement === 'more' ? 'more' : 'top',
    });
  }
  return items;
}

function pickHeader(input: any) {
  return {
    logoUrl: asString(input?.logoUrl, 500),
    navItems: pickNavItems(input?.navItems),
    ctaText: asString(input?.ctaText, 80),
    ctaLink: asString(input?.ctaLink, 200),
    announcementText: asString(input?.announcementText, 200),
    announcementVisible: input?.announcementVisible === true,
  };
}

function parsePriceINR(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return 199;
  return Math.min(999999, Math.round(n));
}

function pickGeneral(input: any) {
  return {
    brandName: asString(input?.brandName, 80),
    primaryColor: asString(input?.primaryColor, 20),
    secondaryColor: asString(input?.secondaryColor, 20),
    whatsappNumber: asString(input?.whatsappNumber, 40),
    supportEmail: asString(input?.supportEmail, 120),
    phone: asString(input?.phone, 40),
    webinarEntryPriceINR: parsePriceINR(input?.webinarEntryPriceINR),
  };
}

function pickMaintenance(input: any) {
  return {
    enabled: input?.enabled === true,
    title: asString(input?.title, 200),
    message: asString(input?.message, 2000),
    eta: asString(input?.eta, 200),
  };
}

function pickResources(input: any) {
  return {
    heading: asString(input?.heading, 200),
    subtitle: asString(input?.subtitle, 800),
  };
}

function pickHomeStats(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 8).map((raw) => {
    const row = raw && typeof raw === 'object' ? (raw as { label?: unknown; value?: unknown }) : {};
    return {
      label: asString(row.label, 80),
      value: asString(row.value, 160),
    };
  }).filter((row) => row.label || row.value);
}

function pickTrustPoints(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 8).map((raw) => {
    const row = raw && typeof raw === 'object' ? (raw as { title?: unknown; description?: unknown }) : {};
    return {
      title: asString(row.title, 80),
      description: asString(row.description, 400),
    };
  }).filter((row) => row.title || row.description);
}

const NEXT_STEP_PAGES = new Set(['counselling', 'plans', ...NAV_PAGES]);

function pickNextStepCards(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 8).map((raw) => {
    const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const target = typeof row.targetPage === 'string' ? row.targetPage.trim() : '';
    return {
      title: asString(row.title, 80),
      subtitle: asString(row.subtitle, 160),
      description: asString(row.description, 400),
      ctaText: asString(row.ctaText, 60),
      targetPage: NEXT_STEP_PAGES.has(target) ? target : '',
      badge: asString(row.badge, 40),
      color: row.color === 'green' ? 'green' : 'blue',
    };
  }).filter((row) => row.title || row.subtitle || row.description);
}

function pickFaqItems(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 16).map((raw) => {
    const row = raw && typeof raw === 'object' ? (raw as { question?: unknown; answer?: unknown }) : {};
    return {
      question: asString(row.question, 200),
      answer: asString(row.answer, 800),
    };
  }).filter((row) => row.question || row.answer);
}

function pickJourneyStages(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 12).map((raw) => {
    const row = raw && typeof raw === 'object' ? (raw as { title?: unknown; badge?: unknown; desc?: unknown }) : {};
    return {
      title: asString(row.title, 80),
      badge: asString(row.badge, 60),
      desc: asString(row.desc, 400),
    };
  }).filter((row) => row.title || row.badge || row.desc);
}

const HOME_SECTION_IDS = [
  'hero',
  'nextStep',
  'journey',
  'plans',
  'masterclasses',
  'checkIn',
  'services',
  'mentors',
  'leadership',
  'story',
  'trust',
  'faq',
  'cta',
] as const;

function pickHomeHtml(input: unknown) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const out: Record<string, { enabled: boolean; html: string }> = {};
  for (const id of HOME_SECTION_IDS) {
    const row = raw[id] && typeof raw[id] === 'object' && !Array.isArray(raw[id]) ? (raw[id] as Record<string, unknown>) : {};
    out[id] = {
      enabled: row.enabled === true,
      html: asString(row.html, 80_000),
    };
  }
  return out;
}

function pickSectionVisibility(input: unknown) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const out: Record<string, boolean> = {};
  for (const id of HOME_SECTION_IDS) {
    out[id] = raw[id] !== false;
  }
  return out;
}

function pickHome(input: any) {
  return {
    heroTitle: asString(input?.heroTitle, 300),
    heroSubtitle: asString(input?.heroSubtitle, 400),
    heroDescription: asString(input?.heroDescription, 800),
    heroCtaText: asString(input?.heroCtaText, 80),
    heroImageUrl: asString(input?.heroImageUrl, 500),
    stats: pickHomeStats(input?.stats),
    nextStepEyebrow: asString(input?.nextStepEyebrow, 80),
    nextStepTitle: asString(input?.nextStepTitle, 200),
    nextStepDescription: asString(input?.nextStepDescription, 600),
    nextStepCtaText: asString(input?.nextStepCtaText, 80),
    nextStepCtaPage: NEXT_STEP_PAGES.has(asString(input?.nextStepCtaPage, 40))
      ? asString(input?.nextStepCtaPage, 40)
      : '',
    nextStepCards: pickNextStepCards(input?.nextStepCards),
    journeyEyebrow: asString(input?.journeyEyebrow, 80),
    journeyTitle: asString(input?.journeyTitle, 200),
    journeyDescription: asString(input?.journeyDescription, 600),
    journeyCtaEyebrow: asString(input?.journeyCtaEyebrow, 80),
    journeyCtaTitle: asString(input?.journeyCtaTitle, 160),
    journeyCtaDescription: asString(input?.journeyCtaDescription, 400),
    journeyMoreText: asString(input?.journeyMoreText, 80),
    journeyStages: pickJourneyStages(input?.journeyStages),
    trustEyebrow: asString(input?.trustEyebrow, 80),
    trustTitle: asString(input?.trustTitle, 200),
    trustDescription: asString(input?.trustDescription, 600),
    trustPoints: pickTrustPoints(input?.trustPoints),
    trustCommitmentTitle: asString(input?.trustCommitmentTitle, 120),
    trustCommitmentDescription: asString(input?.trustCommitmentDescription, 600),
    trustCommitmentNote: asString(input?.trustCommitmentNote, 80),
    faqEyebrow: asString(input?.faqEyebrow, 80),
    faqTitle: asString(input?.faqTitle, 200),
    faqDescription: asString(input?.faqDescription, 600),
    faqItems: pickFaqItems(input?.faqItems),
    servicesEyebrow: asString(input?.servicesEyebrow, 80),
    servicesTitle: asString(input?.servicesTitle, 200),
    servicesDescription: asString(input?.servicesDescription, 600),
    masterclassesEyebrow: asString(input?.masterclassesEyebrow, 80),
    masterclassesTitle: asString(input?.masterclassesTitle, 200),
    masterclassesDescription: asString(input?.masterclassesDescription, 600),
    masterclassesButtonText: asString(input?.masterclassesButtonText, 60),
    checkInEyebrow: asString(input?.checkInEyebrow, 80),
    checkInTitle: asString(input?.checkInTitle, 200),
    checkInDescription: asString(input?.checkInDescription, 600),
    checkInButtonText: asString(input?.checkInButtonText, 60),
    sectionVisibility: pickSectionVisibility(input?.sectionVisibility),
    homeHtml: pickHomeHtml(input?.homeHtml),
  };
}

function toPublic(doc: any) {
  const obj = doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...(doc || {}) };
  delete obj._id;
  delete obj.__v;
  return {
    ...obj,
    general: pickGeneral(obj.general),
    home: pickHome(obj.home),
    maintenance: pickMaintenance(obj.maintenance),
    resources: pickResources(obj.resources),
  };
}

function pickSettingsUpdate(body: any): Record<string, unknown> {
  const $set: Record<string, unknown> = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return $set;
  for (const key of SECTION_KEYS) {
    if (body[key] == null || typeof body[key] !== 'object' || Array.isArray(body[key])) continue;
    $set[key] =
      key === 'maintenance'
        ? pickMaintenance(body[key])
        : key === 'header'
          ? pickHeader(body[key])
          : key === 'general'
            ? pickGeneral(body[key])
            : key === 'resources'
              ? pickResources(body[key])
              : key === 'home'
                ? pickHome(body[key])
                : body[key];
  }
  return $set;
}

async function getOrCreateSettings() {
  let doc = await SiteSettings.collection.findOne({});
  if (!doc) {
    const created = await SiteSettings.create({});
    doc = created.toObject();
  }
  return doc;
}

// Public — read-only. Schema carries no secrets, so the whole document is safe to return.
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, settings: toPublic(settings) });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site settings.',
    });
  }
});

// Admin-only — section updates only. Never $set _id / __v (that made maintenance
// saves fail or get stripped by a cached Mongoose schema).
router.put('/', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const $set = pickSettingsUpdate(req.body);
    if (!Object.keys($set).length) {
      res.status(400).json({ success: false, error: 'Nothing to update.' });
      return;
    }
    await SiteSettings.collection.updateOne({}, { $set }, { upsert: true });
    const settings = await getOrCreateSettings();
    const sections = Object.keys($set).join(', ');
    recordAdminAudit(req, {
      action: 'update',
      entity: 'settings',
      summary: `${actorFromReq(req).name} updated site settings${sections ? ` (${sections})` : ''}`,
      details: { sections: Object.keys($set) },
    });
    res.json({ success: true, settings: toPublic(settings) });
  } catch (error) {
    console.error('Error updating site settings:', error);
    res.status(400).json({
      success: false,
      error: 'Unable to update site settings.',
    });
  }
});

export default router;
