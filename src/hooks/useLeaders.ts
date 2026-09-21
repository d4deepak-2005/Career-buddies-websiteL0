import { useMemo } from 'react';
import { LEADERSHIP_DATA, LeaderProfile } from '../config/leadershipData';
import { PersonRecord, usePeople } from './usePeople';

// One source of truth for the founder / co-founder profiles shown on the Home and About sections,
// the Leadership page and the individual profile pages.
//
// The CMS `people` collection wins: only visible people appear, in the admin's order, and its
// text fields override the built-in ones. The built-in LEADERSHIP_DATA supplies the extra long-form
// details the CMS has no fields for (career summary, philosophy, ...) when the same person is found
// there (matched by e-mail, then slug, then first name). If the CMS has no founders / co-founders
// (empty or unreachable) the built-in list is used unchanged.

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function findBase(person: PersonRecord): LeaderProfile | undefined {
  const email = (person.email || '').trim().toLowerCase();
  const slug = (person.slug || slugify(person.name)).toLowerCase();
  const first = person.name.trim().toLowerCase().split(/\s+/)[0];
  return (
    (email && LEADERSHIP_DATA.find((l) => l.email.toLowerCase() === email)) ||
    LEADERSHIP_DATA.find((l) => l.profileSlug === slug) ||
    (first && LEADERSHIP_DATA.find((l) => l.name.toLowerCase().split(/\s+/)[0] === first)) ||
    undefined
  );
}

function toLeader(person: PersonRecord): LeaderProfile {
  const base = findBase(person);
  const about = (person.longBio || person.shortBio || '').trim();
  return {
    // Details the CMS cannot hold: from the built-in profile if this person has one, otherwise empty.
    headline: base?.headline || person.title || '',
    about: base?.about || (about ? [about] : []),
    experienceSummary: base?.experienceSummary || '',
    experienceHighlights: base?.experienceHighlights || [],
    focusAreas: base?.focusAreas || [],
    roleResponsibilities: base?.roleResponsibilities || [],
    philosophy: base?.philosophy || { quote: '', context: '' },
    yearsNum: base?.yearsNum || 0,
    fallbackImage: base?.fallbackImage,
    directWhatsApp: base?.directWhatsApp,
    // CMS values take precedence.
    id: person._id,
    profileSlug: person.slug || slugify(person.name),
    name: person.name,
    role: person.role === 'founder' ? 'Founder' : 'Co-Founder',
    title: person.title || base?.title || '',
    image: person.photoUrl || base?.image || '',
    yearsOfExperience: person.yearsOfExperience || base?.yearsOfExperience || '',
    shortBio: person.shortBio || base?.shortBio || '',
    expertise: person.expertise && person.expertise.length ? person.expertise : base?.expertise || [],
    roleAtCareerBuddies: person.longBio || base?.roleAtCareerBuddies || '',
    email: person.email || base?.email || '',
    linkedIn: person.linkedIn || base?.linkedIn || '',
  };
}

// CMS-backed founders / co-founders, or null when the CMS has none (callers fall back).
export function useCmsLeaders(): LeaderProfile[] | null {
  const { people } = usePeople();
  return useMemo(() => {
    const founders = people.filter((p) => p.role === 'founder' || p.role === 'co-founder');
    return founders.length ? founders.map(toLeader) : null;
  }, [people]);
}

// The list every leadership view should render.
export function useLeaderList(): LeaderProfile[] {
  return useCmsLeaders() ?? LEADERSHIP_DATA;
}
