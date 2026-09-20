import { useEffect, useState } from 'react';

export interface PersonRecord {
  _id: string;
  name: string;
  slug?: string;
  role: 'founder' | 'co-founder' | 'leadership';
  title: string;
  yearsOfExperience: string;
  photoUrl: string;
  shortBio: string;
  longBio: string;
  email: string;
  linkedIn: string;
  expertise: string[];
}

// Fetches the public `people` collection (Founders/Co-Founders/Leadership).
// Returns an empty array on failure or while loading — callers fall back to
// their existing static config in that case, so the public site never breaks.
export function usePeople() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/people')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Request failed'))))
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.items)) {
          setPeople(data.items);
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

  return { people, loading };
}
