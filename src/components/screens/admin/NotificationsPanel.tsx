import React, { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { AdminNotice, AdminNoticeType } from '../../../hooks/useAdminNotifications';
import { NoticeRow } from './NotificationsDrawer';

const FILTERS: { id: 'all' | AdminNoticeType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lead', label: 'Leads' },
  { id: 'query', label: 'Queries' },
  { id: 'payment', label: 'Payments' },
  { id: 'user', label: 'Users' },
];

export const NotificationsPanel: React.FC<{
  items: AdminNotice[];
  unreadIds: Set<string>;
  onOpenItem: (item: AdminNotice) => void;
}> = ({ items, unreadIds, onOpenItem }) => {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const shown = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.type === filter)),
    [items, filter]
  );

  return (
    <div className="bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--admin-text)]">Notifications</h2>
          <p className="text-[12px] text-[var(--admin-muted)] mt-0.5">Leads, queries, payments, and new users from the last 30 days.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`h-8 px-3 rounded-lg text-[12px] font-medium cursor-pointer border ${
                filter === f.id
                  ? 'bg-[var(--admin-active)] text-[var(--admin-text)] border-[var(--admin-border)]'
                  : 'bg-transparent text-[var(--admin-muted)] border-[var(--admin-border)] hover:bg-[var(--admin-hover)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--admin-border)]">
        {shown.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--admin-soft)] text-[var(--admin-muted)] flex items-center justify-center mx-auto mb-3">
              <Bell className="w-4 h-4" />
            </div>
            <p className="text-[13px] text-[var(--admin-muted)]">Nothing in this filter yet.</p>
          </div>
        ) : (
          shown.map((item) => (
            <NoticeRow key={item.id} item={item} unread={unreadIds.has(item.id)} onOpen={onOpenItem} />
          ))
        )}
      </div>
    </div>
  );
};
