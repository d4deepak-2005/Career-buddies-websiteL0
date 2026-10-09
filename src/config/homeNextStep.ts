import { DEFAULT_NAV_TABS } from './navTabs';
import { NEXT_STEP_OPTIONS } from './siteConfig';

export const NEXT_STEP_PAGE_OPTIONS = [
  { page: 'counselling', label: 'Connect with advisor (popup)' },
  { page: 'plans', label: 'Plans' },
  ...DEFAULT_NAV_TABS.map((tab) => ({ page: tab.page, label: tab.label })),
];

const NEXT_STEP_PAGE_SET = new Set(NEXT_STEP_PAGE_OPTIONS.map((item) => item.page));

export function isNextStepPage(value: unknown): value is string {
  return typeof value === 'string' && NEXT_STEP_PAGE_SET.has(value);
}

export const DEFAULT_HOME_NEXT_STEP = {
  eyebrow: 'Interactive Decision Path',
  title: 'What do you need help with right now?',
  description:
    'Every career journey faces distinct inflection points. Select your primary goal below to immediately access the most relevant guidance, mentors, or learning programs.',
  ctaText: 'Unsure? Take 2-min Career Check-in',
  ctaPage: 'career-check-in',
  cards: NEXT_STEP_OPTIONS.map((card) => ({
    title: card.title,
    subtitle: card.subtitle,
    description: card.description,
    ctaText: card.ctaText,
    targetPage: card.targetPage,
    badge: card.badge,
    color: card.color === 'green' ? 'green' : 'blue',
  })),
};

export type NextStepCard = (typeof DEFAULT_HOME_NEXT_STEP.cards)[number];

export function resolveNextStepContent(home?: {
  nextStepEyebrow?: string;
  nextStepTitle?: string;
  nextStepDescription?: string;
  nextStepCtaText?: string;
  nextStepCtaPage?: string;
  nextStepCards?: Partial<NextStepCard>[];
} | null) {
  const saved = home?.nextStepCards || [];
  const count = Math.max(DEFAULT_HOME_NEXT_STEP.cards.length, saved.length);
  const cards = Array.from({ length: count }, (_, index) => {
    const fallback = DEFAULT_HOME_NEXT_STEP.cards[index] || {
      title: '',
      subtitle: '',
      description: '',
      ctaText: 'Continue',
      targetPage: 'home',
      badge: '',
      color: 'blue' as const,
    };
    const row = saved[index] || {};
    const targetPage = isNextStepPage(row.targetPage) ? row.targetPage : fallback.targetPage;
    return {
      title: row.title?.trim() || fallback.title,
      subtitle: row.subtitle?.trim() || fallback.subtitle,
      description: row.description?.trim() || fallback.description,
      ctaText: row.ctaText?.trim() || fallback.ctaText,
      targetPage,
      badge: row.badge?.trim() || fallback.badge,
      color: row.color === 'green' ? 'green' : 'blue',
    };
  }).filter((card) => card.title);
  return {
    eyebrow: home?.nextStepEyebrow?.trim() || DEFAULT_HOME_NEXT_STEP.eyebrow,
    title: home?.nextStepTitle?.trim() || DEFAULT_HOME_NEXT_STEP.title,
    description: home?.nextStepDescription?.trim() || DEFAULT_HOME_NEXT_STEP.description,
    ctaText: home?.nextStepCtaText?.trim() || DEFAULT_HOME_NEXT_STEP.ctaText,
    ctaPage: isNextStepPage(home?.nextStepCtaPage) ? home.nextStepCtaPage : DEFAULT_HOME_NEXT_STEP.ctaPage,
    cards,
  };
}
