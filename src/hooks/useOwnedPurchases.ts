import { useEffect, useState } from 'react';
import { candidateFetch, getCandidateToken } from '../utils/candidateAuth';

export type PurchasableType = 'webinar' | 'plan' | 'programme';

const EMPTY = { webinar: [] as string[], plan: [] as string[], programme: [] as string[] };

export function useOwnedPurchases() {
  const [items, setItems] = useState(EMPTY);
  const token = getCandidateToken();

  useEffect(() => {
    if (!token) {
      setItems(EMPTY);
      return;
    }
    let live = true;
    candidateFetch('/api/payments/owned')
      .then((res) => res.json())
      .then((data) => {
        if (!live || !data?.success || !data.items) return;
        setItems({
          webinar: data.items.webinar || [],
          plan: data.items.plan || [],
          programme: data.items.programme || [],
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [token]);

  const has = (type: PurchasableType, id?: string) => Boolean(id && items[type].includes(id));
  return { has, items, loggedIn: Boolean(token) };
}
