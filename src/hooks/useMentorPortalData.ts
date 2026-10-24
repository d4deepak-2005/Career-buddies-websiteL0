import { useCallback, useEffect, useState } from 'react';
import { candidateFetch } from '../utils/candidateAuth';
import { MENTOR_PORTAL_SAMPLE_DATA, type MentorPortalData } from '../config/mentorPortalSampleData';

// Single place the Mentor Portal gets its data from.
// - Signed-in mentor: the live data from GET /api/mentor/portal (their own sessions and candidates).
// - Local sample preview (no account): the labelled sample data.
async function loadMentorPortalData(live: boolean): Promise<MentorPortalData> {
  if (!live) {
    // structuredClone so local edits never mutate the shared sample object.
    return structuredClone(MENTOR_PORTAL_SAMPLE_DATA);
  }
  const res = await candidateFetch('/api/mentor/portal');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not load your sessions.');
  return body as MentorPortalData;
}

export function useMentorPortalData(live: boolean) {
  const [data, setData] = useState<MentorPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadMentorPortalData(live));
    } catch (err: any) {
      setError(err?.message || 'Could not load your mentor data.');
    } finally {
      setLoading(false);
    }
  }, [live]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, setData, loading, error, refresh };
}
