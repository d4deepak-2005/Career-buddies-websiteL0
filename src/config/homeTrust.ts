import { WHY_TRUST_POINTS } from './siteConfig';

export const DEFAULT_HOME_TRUST = {
  eyebrow: 'Authentic Guidance Philosophy',
  title: 'Why Trust CareerBuddies?',
  description:
    'We reject superficial career hacks and generic motivation. Our platform is built on grounded conversations with experienced practitioners who understand what hiring bars truly require.',
  points: WHY_TRUST_POINTS.map((item) => ({
    title: item.title,
    description: item.description,
  })),
  commitmentTitle: 'Our Commitment to You',
  commitmentDescription:
    'If a 1:1 session or masterclass does not deliver clear, actionable value for your career questions, our team will personally arrange an alternative session or provide a hassle-free refund.',
  commitmentNote: 'Hassle-Free Satisfaction Standard',
};

export function resolveTrustContent(home?: {
  trustEyebrow?: string;
  trustTitle?: string;
  trustDescription?: string;
  trustPoints?: { title?: string; description?: string }[];
  trustCommitmentTitle?: string;
  trustCommitmentDescription?: string;
  trustCommitmentNote?: string;
} | null) {
  const saved = home?.trustPoints || [];
  const count = Math.max(DEFAULT_HOME_TRUST.points.length, saved.length);
  const points = Array.from({ length: count }, (_, index) => {
    const fallback = DEFAULT_HOME_TRUST.points[index] || { title: '', description: '' };
    const row = saved[index];
    const title = row?.title?.trim() || fallback.title;
    const description = row?.description?.trim() || fallback.description;
    return { title, description };
  }).filter((item) => item.title);
  return {
    eyebrow: home?.trustEyebrow?.trim() || DEFAULT_HOME_TRUST.eyebrow,
    title: home?.trustTitle?.trim() || DEFAULT_HOME_TRUST.title,
    description: home?.trustDescription?.trim() || DEFAULT_HOME_TRUST.description,
    points,
    commitmentTitle: home?.trustCommitmentTitle?.trim() || DEFAULT_HOME_TRUST.commitmentTitle,
    commitmentDescription: home?.trustCommitmentDescription?.trim() || DEFAULT_HOME_TRUST.commitmentDescription,
    commitmentNote: home?.trustCommitmentNote?.trim() || DEFAULT_HOME_TRUST.commitmentNote,
  };
}
