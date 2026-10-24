import { useEffect, useState } from 'react';
import { fetchPublicJson, peekPublicJson, PUBLIC_CACHE_CLEARED } from '../utils/publicCache';
import { NavTabSetting } from '../config/navTabs';

export interface SiteSettingsData {
  general: {
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    whatsappNumber: string;
    supportEmail: string;
    phone: string;
    webinarEntryPriceINR: number;
  };
  header: {
    logoUrl: string;
    navItems: NavTabSetting[];
    ctaText: string;
    ctaLink: string;
    announcementText: string;
    announcementVisible: boolean;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    heroDescription: string;
    heroCtaText: string;
    heroImageUrl: string;
    stats: { label: string; value: string; badge?: string }[];
    nextStepEyebrow: string;
    nextStepTitle: string;
    nextStepDescription: string;
    nextStepCtaText: string;
    nextStepCtaPage: string;
    nextStepCards: {
      title: string;
      subtitle: string;
      description: string;
      ctaText: string;
      targetPage: string;
      badge: string;
      color: string;
    }[];
    journeyEyebrow: string;
    journeyTitle: string;
    journeyDescription: string;
    journeyCtaEyebrow: string;
    journeyCtaTitle: string;
    journeyCtaDescription: string;
    journeyMoreText: string;
    journeyStages: { title: string; badge: string; desc: string }[];
    trustEyebrow: string;
    trustTitle: string;
    trustDescription: string;
    trustPoints: { title: string; description: string }[];
    trustCommitmentTitle: string;
    trustCommitmentDescription: string;
    trustCommitmentNote: string;
    faqEyebrow: string;
    faqTitle: string;
    faqDescription: string;
    faqItems: { question: string; answer: string }[];
    servicesEyebrow: string;
    servicesTitle: string;
    servicesDescription: string;
    masterclassesEyebrow: string;
    masterclassesTitle: string;
    masterclassesDescription: string;
    masterclassesButtonText: string;
    checkInEyebrow: string;
    checkInTitle: string;
    checkInDescription: string;
    checkInButtonText: string;
    sectionVisibility: Record<string, boolean>;
    homeHtml: Record<string, { enabled: boolean; html: string }>;
  };
  about: {
    title: string;
    mission: string;
    vision: string;
    values: { title: string; description: string }[];
  };
  footer: {
    description: string;
    socialLinks: { platform: string; url: string }[];
    copyrightText: string;
    statsMode?: 'auto' | 'manual';
    statsManual?: {
      mentors?: string;
      webinars?: string;
      programmes?: string;
      plans?: string;
    };
  };
  contact: {
    title: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    mapEmbedUrl: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    faviconUrl: string;
    analyticsId: string;
  };
  maintenance: {
    enabled: boolean;
    title: string;
    message: string;
    eta: string;
  };
  resources: {
    heading: string;
    subtitle: string;
  };
}

// Fetches the Site Settings singleton once. If the request fails (backend
// down, network issue, etc.) `settings` stays null and every consumer keeps
// rendering its own existing hardcoded content — the public site never
// breaks because Site Settings is unavailable or not yet populated.
export function useSiteSettings() {
  const cached = peekPublicJson('/api/site-settings');
  const [settings, setSettings] = useState<SiteSettingsData | null>(cached?.success && cached.settings ? cached.settings : null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    const load = (fresh = false) => {
      fetchPublicJson('/api/site-settings', fresh ? { fresh: true } : undefined)
        .then((data) => {
          if (!cancelled && data?.success && data.settings) {
            setSettings(data.settings);
          }
        })
        .catch(() => {
          // Silently fall back — see comment above.
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load();
    const onCleared = () => load(true);
    window.addEventListener(PUBLIC_CACHE_CLEARED, onCleared);
    const interval = window.setInterval(() => load(true), 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener(PUBLIC_CACHE_CLEARED, onCleared);
      window.clearInterval(interval);
    };
  }, []);

  return { settings, loading };
}

// Use a Site Settings value when an admin has actually set it, otherwise
// keep today's existing hardcoded copy exactly as-is.
export function pickText(value: string | undefined | null, fallback: string): string {
  return value && value.trim() ? value : fallback;
}
