import { useEffect, useState } from 'react';

// Fetches a public CMS collection (e.g. '/api/programmes') once. Returns an
// empty array on failure, timeout, or while loading — every caller falls
// back to its existing static config in that case, so the public site never
// goes blank because Site Settings / CMS data is missing or unreachable.
export function usePublicCollection<T = any>(apiPath: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(apiPath)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Request failed'))))
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
