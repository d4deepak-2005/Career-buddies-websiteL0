import { PageView } from '../types';

export type NavPlacement = 'top' | 'more';

export interface NavTabSetting {
  page: PageView;
  label: string;
  enabled: boolean;
  placement: NavPlacement;
}

export interface NavTabMeta {
  page: PageView;
  label: string;
  placement: NavPlacement;
  description?: string;
  badge?: string;
}

export const DEFAULT_NAV_TABS: NavTabMeta[] = [
  { page: 'home', label: 'Home', placement: 'top' },
  { page: 'services', label: 'Services', placement: 'top' },
  { page: 'programmes', label: 'Programmes', placement: 'top' },
  { page: 'career-check-in', label: 'Career Check-in', placement: 'top', description: 'Self-assessment diagnostic', badge: 'Free' },
  { page: 'how-it-works', label: 'How CareerBuddies Works', placement: 'more', description: '5-Step Candidate Journey', badge: '5 Steps' },
  { page: 'webinars', label: 'Live Webinars', placement: 'more', description: 'Join mentor-led career webinars' },
  { page: 'mentors', label: 'Find a Mentor', placement: 'more', description: 'Browse verified industry mentors' },
  { page: 'leadership', label: 'Leadership', placement: 'more', description: 'Meet Founder & Co-Founders' },
  { page: 'success-stories', label: 'Success Stories', placement: 'more', description: 'Verified career transformations' },
  { page: 'resources', label: 'Resources', placement: 'more', description: 'Career playbooks & guides' },
  { page: 'about-us', label: 'About', placement: 'more', description: 'Our mission & story since 2022' },
  { page: 'contact', label: 'Contact Support', placement: 'more', description: 'Bengaluru Office & WhatsApp' },
];

export const NAV_TAB_PAGES = DEFAULT_NAV_TABS.map((tab) => tab.page);

const NAV_PAGE_SET = new Set<string>(NAV_TAB_PAGES);

function asPage(value: unknown): PageView | null {
  return typeof value === 'string' && NAV_PAGE_SET.has(value) ? (value as PageView) : null;
}

export function resolveNavTabs(saved?: Array<Partial<NavTabSetting> & { page?: string; label?: string }> | null): NavTabSetting[] {
  const byPage = new Map<string, Partial<NavTabSetting>>();
  for (const item of saved || []) {
    const page = asPage(item?.page);
    if (!page || byPage.has(page)) continue;
    byPage.set(page, item);
  }

  return DEFAULT_NAV_TABS.map((def) => {
    const override = byPage.get(def.page);
    return {
      page: def.page,
      label: override?.label?.trim() || def.label,
      enabled: override?.enabled !== false,
      placement: override?.placement === 'more' || override?.placement === 'top' ? override.placement : def.placement,
    };
  });
}

export function navTabMeta(page: PageView): NavTabMeta | undefined {
  return DEFAULT_NAV_TABS.find((tab) => tab.page === page);
}

export function visibleNavTabs(saved?: Array<Partial<NavTabSetting> & { page?: string; label?: string }> | null) {
  const items = resolveNavTabs(saved).filter((item) => item.enabled);
  return {
    top: items.filter((item) => item.placement === 'top'),
    more: items.filter((item) => item.placement === 'more'),
    all: items,
  };
}

function canonicalNavPage(page: string): string {
  if (page === 'features') return 'mentors';
  if (page === 'leader-profile') return 'leadership';
  return page;
}

export function isNavPageEnabled(
  page: string,
  saved?: Array<Partial<NavTabSetting> & { page?: string; label?: string }> | null
): boolean {
  const canonical = canonicalNavPage(page);
  const item = resolveNavTabs(saved).find((tab) => tab.page === canonical);
  return item ? item.enabled : true;
}
