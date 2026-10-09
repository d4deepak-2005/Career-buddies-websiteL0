import { useCallback, useEffect, useState } from 'react';
import { MENTOR_PORTAL_SAMPLE_DATA, type MentorPortalData } from '../config/mentorPortalSampleData';

// Single place the Mentor Portal gets its data from. Today it returns the labelled
// sample data; when a mentor sessions API exists, replace the body of
// loadMentorPortalData() with e.g.:
//
//   const res = await candidateFetch('/api/mentor/portal');
//   if (!res.ok) throw new Error('Could not load your sessions.');
//   return (await res.json()) as MentorPortalData;
//
// (candidateFetch from ../utils/candidateAuth sends the shared session token.)
async function loadMentorPortalData(): Promise<MentorPortalData> {
  // structuredClone so local edits (notes, availability) never mutate the shared sample object.
  return structuredClone(MENTOR_PORTAL_SAMPLE_DATA);
}

export function useMentorPortalData() {
  const [data, setData] = useState<MentorPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadMentorPortalData());
    } catch (err: any) {
      setError(err?.message || 'Could not load your mentor data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, setData, loading, error, refresh };
}
