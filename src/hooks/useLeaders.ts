import { useMemo } from 'react';
import { LeaderProfile } from '../config/leadershipData';
import { PersonRecord, usePeople } from './usePeople';

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function roleLabel(role: PersonRecord['role']): LeaderProfile['role'] {
  if (role === 'founder') return 'Founder';
  if (role === 'co-founder') return 'Co-Founder';
  return 'Leadership';
}

function toLeader(person: PersonRecord): LeaderProfile {
  const about = (person.longBio || person.shortBio || '').trim();
  const aboutParagraphs = about
    ? about.split(/\n\n+/).map((part) => part.trim()).filter(Boolean)
    : [];

  return {
    id: person._id,
    profileSlug: person.slug || slugify(person.name),
    name: person.name,
    role: roleLabel(person.role),
    title: person.title || '',
    image: person.photoUrl || '',
    yearsOfExperience: person.yearsOfExperience || '',
    yearsNum: parseInt(person.yearsOfExperience, 10) || 0,
    headline: person.shortBio || person.title || '',
    shortBio: person.shortBio || '',
    about: aboutParagraphs,
    experienceSummary: person.yearsOfExperience || '',
    experienceHighlights: [],
    expertise: person.expertise || [],
    careerHighlights: person.careerHighlights || [],
    focusAreas: person.expertise || [],
    roleAtCareerBuddies: person.longBio || person.shortBio || '',
    roleResponsibilities: [],
    philosophy: { quote: '', context: '' },
    email: person.email || '',
    linkedIn: person.linkedIn || '',
  };
}

// CMS people only. Empty admin list = empty Home / Leadership / profile views.
export function useLeaderListState(): { leaders: LeaderProfile[]; loading: boolean } {
  const { people, loading } = usePeople();
  const leaders = useMemo(
    () =>
      people
        .filter((p) => p.role === 'founder' || p.role === 'co-founder' || p.role === 'leadership')
        .map(toLeader),
    [people]
  );
  return { leaders, loading };
}

export function useLeaderList(): LeaderProfile[] {
  return useLeaderListState().leaders;
}

export function useCmsLeaders(): LeaderProfile[] | null {
  const leaders = useLeaderList();
  return leaders.length ? leaders : null;
}
