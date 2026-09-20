import { PageView } from '../types';

export interface PageNavigationItem {
  id: PageView;
  title: string;
  shortLabel: string;
  path: string;
  inMainMenu?: boolean;
  inDropdown?: boolean;
  badge?: string;
}

export const LOGICAL_PAGE_JOURNEY: PageView[] = [
  'home',
  'services',
  'programmes',
  'webinars',
  'career-check-in',
  'leadership',
  'success-stories',
  'about-us',
  'contact'
];

export const PAGE_TITLES: Record<PageView, string> = {
  'home': 'Home',
  'services': 'Services',
  'programmes': 'Programmes',
  'webinars': 'Live Webinars',
  'career-check-in': 'Career Check-in',
  'leadership': 'Leadership',
  'leader-profile': 'Leader Profile',
  'success-stories': 'Success Stories',
  'about-us': 'About',
  'how-it-works': 'Our Journey',
  'mentors': 'Find a Mentor',
  'features': 'Platform Features',
  'plans': 'Career Acceleration Plans',
  'resources': 'Resources & Playbooks',
  'contact': 'Contact Us',
  'counselling': 'Free Career Counselling',
  'admin': 'Admin Portal',
  'privacy': 'Privacy Policy',
  'terms': 'Terms & Conditions',
  'refund': 'Refund / Cancellation Policy',
  'leads-dashboard': 'Leads Management',
  'dashboard': 'Candidate Dashboard'
};

export function getPreviousPage(currentPage: PageView): { id: PageView; label: string } | null {
  const index = LOGICAL_PAGE_JOURNEY.indexOf(currentPage);
  if (index > 0) {
    const prevId = LOGICAL_PAGE_JOURNEY[index - 1];
    return { id: prevId, label: PAGE_TITLES[prevId] || 'Previous' };
  }
  return null;
}

export function getNextPage(currentPage: PageView): { id: PageView; label: string } | null {
  const index = LOGICAL_PAGE_JOURNEY.indexOf(currentPage);
  if (index >= 0 && index < LOGICAL_PAGE_JOURNEY.length - 1) {
    const nextId = LOGICAL_PAGE_JOURNEY[index + 1];
    return { id: nextId, label: PAGE_TITLES[nextId] || 'Next' };
  }
  return null;
}
