import { useEffect, useState } from 'react';

export interface SiteSettingsData {
  general: {
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    whatsappNumber: string;
    supportEmail: string;
    phone: string;
  };
  header: {
    logoUrl: string;
    navItems: { label: string; page: string }[];
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
    stats: { label: string; value: string }[];
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
}

// Fetches the Site Settings singleton once. If the request fails (backend
// down, network issue, etc.) `settings` stays null and every consumer keeps
// rendering its own existing hardcoded content — the public site never
// breaks because Site Settings is unavailable or not yet populated.
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/site-settings')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Request failed'))))
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

    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading };
}

// Use a Site Settings value when an admin has actually set it, otherwise
// keep today's existing hardcoded copy exactly as-is.
export function pickText(value: string | undefined | null, fallback: string): string {
  return value && value.trim() ? value : fallback;
}
