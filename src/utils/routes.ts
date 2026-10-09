import { PageView } from '../types';

export interface RouteState {
  page: PageView;
  leaderSlug?: string;
}

// Canonical website page routes
export const WEBSITE_PATHS: Partial<Record<PageView, string>> = {
  home: '/',
  'about-us': '/about-us',
  'how-it-works': '/how-it-works',
  services: '/services',
  programmes: '/programmes',
  webinars: '/webinars',
  leadership: '/leadership',
  'leader-profile': '/leadership',
  'success-stories': '/success-stories',
  'career-check-in': '/career-check-in',
  mentors: '/mentors',
  features: '/mentors',
  plans: '/plans',
  resources: '/resources',
  contact: '/contact',
  counselling: '/counselling',
  privacy: '/privacy',
  terms: '/terms',
  refund: '/refund',
};

// Aliases mapping path segments to PageView
const PATH_ALIASES: Record<string, PageView> = {
  about: 'about-us',
  'about-us': 'about-us',
  'how-it-works': 'how-it-works',
  journey: 'how-it-works',
  'our-journey': 'how-it-works',
  services: 'services',
  programmes: 'programmes',
  programs: 'programmes',
  webinars: 'webinars',
  masterclasses: 'webinars',
  leadership: 'leadership',
  leaders: 'leadership',
  'success-stories': 'success-stories',
  stories: 'success-stories',
  'career-check-in': 'career-check-in',
  'check-in': 'career-check-in',
  mentors: 'mentors',
  features: 'mentors',
  plans: 'plans',
  pricing: 'plans',
  resources: 'resources',
  articles: 'resources',
  blog: 'resources',
  contact: 'contact',
  counselling: 'counselling',
  counseling: 'counselling',
  privacy: 'privacy',
  terms: 'terms',
  refund: 'refund',
};

// Backwards-compatible hash mapping (including admin & mentor)
const HASH_MAP: Record<string, PageView> = {
  '#admin': 'admin',
  '#mentor': 'mentor-portal',
  '#privacy': 'privacy',
  '#terms': 'terms',
  '#refund': 'refund',
  '#services': 'services',
  '#programmes': 'programmes',
  '#programs': 'programmes',
  '#webinars': 'webinars',
  '#about-us': 'about-us',
  '#about': 'about-us',
  '#mentors': 'mentors',
  '#features': 'mentors',
  '#plans': 'plans',
  '#pricing': 'plans',
  '#contact': 'contact',
  '#counselling': 'counselling',
  '#how-it-works': 'how-it-works',
  '#leadership': 'leadership',
  '#success-stories': 'success-stories',
  '#career-check-in': 'career-check-in',
  '#resources': 'resources',
};

/**
 * Parses browser URL pathname or hash into the active website page.
 */
export function parseLocation(loc?: { pathname?: string; hash?: string }): RouteState {
  if (typeof window === 'undefined' && !loc) {
    return { page: 'home' };
  }

  const pathname = (loc?.pathname !== undefined ? loc.pathname : window.location.pathname) || '/';
  const hash = (loc?.hash !== undefined ? loc.hash : window.location.hash) || '';

  // 1. Keep admin & mentor hashes untouched
  if (hash === '#admin' || hash.startsWith('#admin/')) {
    return { page: 'admin' };
  }
  if (hash === '#mentor' || hash.startsWith('#mentor/')) {
    return { page: 'mentor-portal' };
  }

  const cleanHash = hash.split('?')[0].toLowerCase();
  if (HASH_MAP[cleanHash]) {
    return { page: HASH_MAP[cleanHash] };
  }

  // 2. Parse website pathname
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    return { page: 'home' };
  }

  const segments = trimmed.split('/');
  const first = segments[0].toLowerCase();

  // Leadership & Leader Profile: /leadership/:slug or /leader/:slug
  if (first === 'leadership' || first === 'leader') {
    if (segments.length >= 2 && segments[1].trim()) {
      return { page: 'leader-profile', leaderSlug: decodeURIComponent(segments[1].trim()) };
    }
    return { page: 'leadership' };
  }

  // Preserve reset password
  if (first === 'reset-password') {
    return { page: 'home' };
  }

  const matched = PATH_ALIASES[first];
  if (matched) {
    return { page: matched };
  }

  return { page: 'home' };
}

/**
 * Returns the proper browser URL for any website page or tab.
 * Admin and mentor keep their hash URLs untouched.
 */
export function getUrlForRoute(
  page: PageView,
  options?: { leaderSlug?: string; preserveSearch?: boolean }
): string {
  // Admin & mentor portal keep original hash behavior
  if (page === 'admin') {
    const hash = typeof window !== 'undefined' && window.location.hash.startsWith('#admin')
      ? window.location.hash
      : '#admin';
    return '/' + hash;
  }
  if (page === 'mentor-portal') {
    const hash = typeof window !== 'undefined' && window.location.hash.startsWith('#mentor')
      ? window.location.hash
      : '#mentor';
    return '/' + hash;
  }
  if (page === 'dashboard' || page === 'leads-dashboard') {
    return '/';
  }

  let pathname = WEBSITE_PATHS[page] || '/';
  if (page === 'leader-profile') {
    const slug = options?.leaderSlug || 'nishant-sharma';
    pathname = `/leadership/${encodeURIComponent(slug)}`;
  }

  const search = options?.preserveSearch && typeof window !== 'undefined' ? window.location.search : '';
  return pathname + search;
}
