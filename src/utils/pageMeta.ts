import { PageView } from '../types';

// Per-page document metadata for the app's state-based pages. (The site has no
// per-page URLs yet, so this keeps the browser tab, history and shared-link text
// accurate; the canonical URL and social image are added by the server from the
// configured public base URL.)
const BRAND = 'CareerBuddies';

interface PageMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

const MENTORS: PageMeta = {
  title: `Find a Mentor | ${BRAND}`,
  description: 'Browse CareerBuddies mentors and book a 1:1 career session.',
};

const META: Partial<Record<PageView, PageMeta>> = {
  home: {
    title: 'CareerBuddies - Your Career, Our Guidance',
    description: 'CareerBuddies pairs you with industry mentors for structured, actionable career growth.',
  },
  services: {
    title: `Services | ${BRAND}`,
    description: 'Explore CareerBuddies career services: counselling, mentorship, resume and interview support.',
  },
  programmes: {
    title: `Programmes | ${BRAND}`,
    description: 'Structured CareerBuddies programmes with mentor guidance for focused career progress.',
  },
  'career-check-in': {
    title: `Career Check-in | ${BRAND}`,
    description: 'Take the 2-minute CareerBuddies Career Check-in to understand where you stand and what to do next.',
  },
  webinars: {
    title: `Live Webinars | ${BRAND}`,
    description: 'Join mentor-led CareerBuddies career webinars and workshops.',
  },
  'success-stories': {
    title: `Success Stories | ${BRAND}`,
    description: 'Read career transition and growth stories from the CareerBuddies community.',
  },
  'how-it-works': {
    title: `How It Works | ${BRAND}`,
    description: 'See how CareerBuddies takes you from career clarity to action, step by step.',
  },
  leadership: {
    title: `Leadership | ${BRAND}`,
    description: 'Meet the CareerBuddies founder and co-founders.',
  },
  'leader-profile': {
    title: `Leadership Profile | ${BRAND}`,
    description: 'Profile of a CareerBuddies founder or co-founder.',
  },
  'about-us': {
    title: `About | ${BRAND}`,
    description: 'Learn about the CareerBuddies mission, story and team.',
  },
  contact: {
    title: `Contact | ${BRAND}`,
    description: 'Contact the CareerBuddies team for career counselling, mentorship and support.',
  },
  counselling: {
    title: `Free Career Counselling | ${BRAND}`,
    description: 'Request a free 1:1 career counselling session with CareerBuddies.',
  },
  mentors: MENTORS,
  features: MENTORS,
  resources: {
    title: `Resources & Career Playbooks | ${BRAND}`,
    description: 'Career playbooks and guides from CareerBuddies.',
  },
  plans: {
    title: `Career Acceleration Plans | ${BRAND}`,
    description: 'Compare CareerBuddies career acceleration plans.',
  },
  privacy: {
    title: `Privacy Policy | ${BRAND}`,
    description: 'How CareerBuddies collects and uses your information.',
  },
  terms: {
    title: `Terms & Conditions | ${BRAND}`,
    description: 'The terms for using the CareerBuddies website and services.',
  },
  refund: {
    title: `Refund / Cancellation Policy | ${BRAND}`,
    description: 'How cancellations and refunds work at CareerBuddies.',
  },
  // Private areas: never indexed, and no account details in the title.
  dashboard: { title: `My Dashboard | ${BRAND}`, description: 'Your CareerBuddies account.', noindex: true },
  admin: { title: `Admin | ${BRAND}`, description: 'CareerBuddies administration.', noindex: true },
  'leads-dashboard': { title: `Admin | ${BRAND}`, description: 'CareerBuddies administration.', noindex: true },
};

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applyPageMeta(page: PageView) {
  const meta = META[page] || META.home!;
  document.title = meta.title;
  setMeta('meta[name="description"]', 'name', 'description', meta.description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);

  const robots = document.head.querySelector('meta[name="robots"]');
  if (meta.noindex) {
    setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
  } else if (robots) {
    robots.remove();
  }
}
