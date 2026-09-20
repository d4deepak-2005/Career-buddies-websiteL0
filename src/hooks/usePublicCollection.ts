import { useEffect, useState } from 'react';
import { fetchPublicJson, peekPublicJson } from '../utils/publicCache';

// Fetches a public CMS collection (e.g. '/api/programmes') once. Returns an
// empty array on failure, timeout, or while loading — every caller falls
// back to its existing static config in that case, so the public site never
// goes blank because Site Settings / CMS data is missing or unreachable.
export function usePublicCollection<T = any>(apiPath: string) {
  const cached = peekPublicJson(apiPath);
  const [items, setItems] = useState<T[]>(cached?.success && Array.isArray(cached.items) ? cached.items : []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    fetchPublicJson(apiPath)
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.items)) {
          setItems(data.items);
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
  }, [apiPath]);

  return { items, loading };
}
