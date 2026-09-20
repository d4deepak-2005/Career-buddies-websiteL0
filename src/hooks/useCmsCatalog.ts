import { useMemo } from 'react';
import { usePublicCollection } from './usePublicCollection';
import {
  ProgrammeItem,
  WebinarItem,
  TestimonialItem,
  ServiceItem,
  PlanItem,
} from '../types';
import { PROGRAMMES_CATALOGUE } from '../config/programmes';
import { INITIAL_WEBINARS } from '../config/siteConfig';
import { SUCCESS_STORIES } from '../config/testimonials';
import { STRUCTURED_SERVICES, CAREER_PLANS } from '../data/mockData';

// Each hook returns MongoDB-backed content mapped to the exact item shape the
// existing screen already renders. If the collection is empty, still loading,
// or the request failed, the existing static content is returned instead — so
// no public section can ever go blank because CMS data is missing.

export function useProgrammes(): ProgrammeItem[] {
  const { items } = usePublicCollection<any>('/api/programmes');
  return useMemo(() => {
    if (!items.length) return PROGRAMMES_CATALOGUE;
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
      dodoProductId: p.dodoProductId || undefined,
    }));
  }, [items]);
}

export function useWebinars(): WebinarItem[] {
  const { items } = usePublicCollection<any>('/api/webinars');
  return useMemo(() => {
    if (!items.length) return INITIAL_WEBINARS;
    return items.map((w) => ({
      id: w._id,
      title: w.title || '',
      tagline: w.tagline || w.description || '',
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
      dodoProductId: w.dodoProductId || undefined,
    }));
  }, [items]);
}

export function useSuccessStories(): TestimonialItem[] {
  const { items } = usePublicCollection<any>('/api/testimonials');
  return useMemo(() => {
    if (!items.length) return SUCCESS_STORIES;
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
    if (!items.length) return STRUCTURED_SERVICES;
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
    if (!items.length) return CAREER_PLANS;
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
      dodoProductId: p.dodoProductId || undefined,
      features: (p.features || []).map((f: any) => ({
        title: f.title || '',
        included: f.included !== false,
        detail: f.detail || undefined,
      })),
    }));
  }, [items]);
}
