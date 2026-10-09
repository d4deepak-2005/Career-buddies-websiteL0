import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch, getAdminToken } from '../utils/adminAuth';

export type AdminNoticeType = 'lead' | 'query' | 'payment' | 'user';

export interface AdminNotice {
  id: string;
  type: AdminNoticeType;
  title: string;
  body: string;
  createdAt: string;
  tab: 'leads' | 'payments' | 'users';
}

const SEEN_KEY = 'cb-admin-notif-seen';

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) || '';
  } catch {
    return '';
  }
}

function mergeNotice(list: AdminNotice[], item: AdminNotice) {
  return [item, ...list.filter((row) => row.id !== item.id)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 80);
}

export function useAdminNotifications() {
  const [items, setItems] = useState<AdminNotice[]>([]);
  const [seenAt, setSeenAt] = useState(readSeen);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/notifications');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch {
      // keep last list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const token = getAdminToken();
    let source: EventSource | null = null;
    if (token) {
      source = new EventSource(`/api/admin/notifications/stream?token=${encodeURIComponent(token)}`);
      source.addEventListener('notice', (event) => {
        try {
          const item = JSON.parse((event as MessageEvent).data) as AdminNotice;
          if (item?.id) setItems((prev) => mergeNotice(prev, item));
        } catch {
          /* ignore bad frames */
        }
      });
    }
    const poll = window.setInterval(load, 60_000);
    return () => {
      window.clearInterval(poll);
      source?.close();
    };
  }, [load]);

  const unread = useMemo(() => {
    if (!seenAt) return items;
    const cut = new Date(seenAt).getTime();
    if (!Number.isFinite(cut)) return items;
    return items.filter((item) => new Date(item.createdAt).getTime() > cut);
  }, [items, seenAt]);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setSeenAt(now);
    try {
      localStorage.setItem(SEEN_KEY, now);
    } catch {
      /* ignore */
    }
  }, []);

  return { items, unread, unreadCount: unread.length, loading, refresh: load, markAllRead };
}
