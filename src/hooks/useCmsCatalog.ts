import { useMemo } from 'react';
import { usePublicCollection } from './usePublicCollection';
import {
  Mentor,
  ProgrammeItem,
  WebinarItem,
  TestimonialItem,
  ServiceItem,
  PlanItem,
  ResourceArticle,
} from '../types';
import { WEBINAR_ENTRY_PRICE_INR } from '../config/webinars';

// Public catalogue screens render MongoDB-backed CMS items only. If a collection
// has no visible rows, that section is empty — there is no demo fallback.

export function useProgrammes(): ProgrammeItem[] {
  const { items } = usePublicCollection<any>('/api/programmes');
  return useMemo(() => {
    return items.map((p) => ({
      id: p._id,
      name: p.name || '',
      category: p.category || '',
      tagline: p.tagline || p.shortDescription || '',
      description: p.description || '',
      duration: p.duration || '',
      feeINR: p.feeINR || 0,
      originalFeeINR: p.originalFeeINR || undefined,
      mentorName: p.mentorName || '',
      mentorRole: p.mentorRole || '',
      mentorCompany: p.mentorCompany || '',
      mentorAvatar: p.mentorAvatar || '',
      availability: '',
      cohortStartDate: p.cohortStartDate || '',
      highlights: p.highlights || [],
      curriculum: p.curriculum || [],
      badge: p.badge || undefined,
      enrolledCount: 0,
      capacity: 0,
      isPopular: !!p.featured,
      onlinePayment: !!p.onlinePayment,
    }));
  }, [items]);
}

export function useWebinars(): WebinarItem[] {
  const { items } = usePublicCollection<any>('/api/webinars');
  return useMemo(() => {
    return items.map((w) => ({
      id: w._id,
      title: w.title || '',
      tagline: w.tagline || w.description || '',
      bannerText: w.bannerText || '',
      category: w.category || '',
      speaker: {
        name: w.speakerName || '',
        role: w.speakerDesignation || '',
        company: w.speakerCompany || '',
        avatar: w.speakerPhotoUrl || '',
        bio: w.speakerBio || '',
      },
      date: w.date || '',
      time: w.time || '',
      duration: w.duration || '',
      description: w.description || '',
      whatYouWillLearn: w.whatYouWillLearn || [],
      targetAudience: w.targetAudience || [],
      priceINR: w.priceINR || 0,
      originalPriceINR: w.originalPriceINR || undefined,
      capacity: w.capacity || 0,
      registeredCount: w.registeredCount || 0,
      status: w.status || 'upcoming',
      recordingIncluded: w.recordingIncluded !== false,
      certificateProvided: w.certificateProvided !== false,
      onlinePayment: !!w.onlinePayment,
    }));
  }, [items]);
}

export function useSuccessStories(): TestimonialItem[] {
  const { items } = usePublicCollection<any>('/api/testimonials');
  return useMemo(() => {
    return items.map((t) => ({
      id: t._id,
      name: t.name || '',
      role: t.role || '',
      company: t.company || '',
      previousRole: t.previousRole || '',
      previousCompany: t.previousCompany || '',
      avatar: t.photoUrl || '',
      story: t.testimonial || '',
      outcomeMetric: t.outcomeMetric || '',
      outcomeType: t.outcomeType || 'clarity',
      rating: Math.max(0, Math.min(5, Math.round(t.rating ?? 5))),
      mentorName: t.mentorName || '',
      serviceUsed: t.serviceUsed || '',
    }));
  }, [items]);
}

export function useServices(): ServiceItem[] {
  const { items } = usePublicCollection<any>('/api/services');
  return useMemo(() => {
    return items.map((s) => ({
      id: s._id,
      title: s.title || '',
      shortDescription: s.shortDescription || '',
      fullDescription: s.fullDescription || s.shortDescription || '',
      category: s.category || '',
      iconName: s.iconName || '',
      iconUrl: s.iconUrl || '',
      duration: s.duration || '',
      deliverables: s.deliverables || [],
      idealFor: s.idealFor || [],
      keyOutcome: s.keyOutcome || '',
      badge: s.badge || undefined,
      popular: !!s.featured,
    }));
  }, [items]);
}

export function usePlans(): PlanItem[] {
  const { items } = usePublicCollection<any>('/api/plans');
  return useMemo(() => {
    return items.map((p) => ({
      id: p._id as any,
      name: p.name || '',
      tagline: p.tagline || '',
      priceINR: p.priceINR || '',
      priceUSD: p.priceUSD || '',
      period: p.period || '',
      isRecommended: !!p.isRecommended,
      isCustomPricing: !!p.isCustomPricing,
      customPricingNote: p.customPricingNote || undefined,
      description: p.description || '',
      sessionsCount: p.sessionsCount || '',
      supportType: p.supportType || '',
      bestFor: p.bestFor || '',
      badge: p.badge || undefined,
      onlinePayment: !!p.onlinePayment,
      features: (p.features || []).map((f: any) => ({
        title: f.title || '',
        included: f.included !== false,
        detail: f.detail || undefined,
      })),
    }));
  }, [items]);
}

export function useMentors(): Mentor[] {
  const { items } = usePublicCollection<any>('/api/mentors');
  return useMemo(() => {
    return items.map((m) => ({
      id: m._id,
      name: m.name || '',
      title: m.designation || '',
      company: m.company || '',
      companyColor: m.companyColor || undefined,
      avatar: m.photoUrl || '',
      rating: m.rating ?? 5,
      reviewCount: m.reviewCount ?? 0,
      sessionsCompleted: m.sessionsCompleted ?? 0,
      hourlyRate: m.hourlyRate ?? 0,
      experienceYears: m.experienceYears ?? 0,
      category: (m.category || 'Engineering') as Mentor['category'],
      bio: m.bio || '',
      longBio: m.longBio || m.bio || '',
      topics: m.topics || [],
      skills: m.expertise || [],
      verified: m.verified !== false,
      featured: !!m.featured,
      superMentor: !!m.superMentor,
      availableNext: m.availableNext || '',
      pastCompanies: m.pastCompanies || [],
      reviews: m.reviews || [],
    }));
  }, [items]);
}

// Live webinars = anything not marked completed. Public CTAs use the cheapest
// of those and can open that webinar. If none are listed, those CTAs hide.
export function useResources(): ResourceArticle[] {
  const { items } = usePublicCollection<any>('/api/resources');
  return useMemo(() => {
    return items.map((r) => {
      const category = String(r.category || '').trim();
      return {
        id: r._id,
        categoryId: category || 'general',
        categoryName: category || 'General',
        title: r.title || '',
        readTime: r.readTime || '',
        publishedDate: r.publishedDate || '',
        summary: r.summary || '',
        content: r.content || '',
        tags: Array.isArray(r.tags) ? r.tags : [],
        author: r.author || '',
        authorRole: r.authorRole || '',
      };
    });
  }, [items]);
}

export function useWebinarOffer(): {
  hasLive: boolean;
  priceINR: number | null;
  webinar: WebinarItem | null;
} {
  const webinars = useWebinars();
  return useMemo(() => {
    const live = webinars.filter((w) => w.status !== 'completed');
    if (live.length === 0) return { hasLive: false, priceINR: null, webinar: null };
    const ranked = [...live].sort((a, b) => {
      const ap = Number(a.priceINR);
      const bp = Number(b.priceINR);
      const aOk = Number.isFinite(ap) && ap > 0;
      const bOk = Number.isFinite(bp) && bp > 0;
      if (aOk && bOk) return ap - bp;
      if (aOk) return -1;
      if (bOk) return 1;
      return 0;
    });
    const webinar = ranked[0];
    const price = Number(webinar.priceINR);
    return {
      hasLive: true,
      priceINR: Number.isFinite(price) && price > 0 ? price : null,
      webinar,
    };
  }, [webinars]);
}

export function useWebinarEntryPrice(): number {
  return useWebinarOffer().priceINR || 0;
}

export function webinarPriceSuffix(priceINR: number | null | undefined): string {
  return priceINR && priceINR > 0 ? ` (₹${priceINR})` : '';
}

// Static copy (FAQs, step descriptions) is written with the built-in entry price; this swaps it for
// the current lowest live webinar price. If there is no live webinar, the ₹199 figure is removed.
export function withEntryPrice(text: string, price: number | null | undefined): string {
  if (!price || price <= 0) {
    return text
      .replace(/\s*\(?\s*Entry Fee:?\s*₹\s*199\s*\)?/gi, '')
      .replace(/\s*₹\s*199\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,)])/g, '$1')
      .trim();
  }
  return text.split(`₹${WEBINAR_ENTRY_PRICE_INR}`).join(`₹${price}`);
}
