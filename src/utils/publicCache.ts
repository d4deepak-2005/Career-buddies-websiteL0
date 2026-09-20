// Shared, short-lived cache for PUBLIC (unauthenticated) content requests such as
// /api/mentors or /api/site-settings. Several components ask for the same collection on one
// page; they now share one request and its result. Nothing user- or session-specific is ever
// stored here (candidate/admin data uses its own authenticated calls and is never cached).

const TTL_MS = 60_000;

interface Entry {
  time: number;
  promise: Promise<any>;
  value?: any;
}

const cache = new Map<string, Entry>();

export function fetchPublicJson(url: string): Promise<any> {
  const existing = cache.get(url);
  if (existing && Date.now() - existing.time < TTL_MS) return existing.promise;

  const entry: Entry = {
    time: Date.now(),
    promise: fetch(url).then((res) => (res.ok ? res.json() : Promise.reject(new Error('Request failed')))),
  };
  entry.promise.then(
    (value) => {
      entry.value = value;
    },
    () => {
      // Failures are never cached: the next caller retries.
      if (cache.get(url) === entry) cache.delete(url);
    }
  );
  cache.set(url, entry);
  return entry.promise;
}

// Already-loaded (still fresh) result, so a component that mounts later renders immediately.
export function peekPublicJson(url: string): any | undefined {
  const entry = cache.get(url);
  return entry && Date.now() - entry.time < TTL_MS ? entry.value : undefined;
}

// Called after an admin changes content so the public pages never show stale data.
export function clearPublicCache() {
  cache.clear();
}
