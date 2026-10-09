import React from 'react';
import { Bell, CreditCard, Inbox, MessageSquare, UserCircle2, X } from 'lucide-react';
import { ModalA11y } from '../../common/ModalA11y';
import { AdminNotice, AdminNoticeType } from '../../../hooks/useAdminNotifications';

function when(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const ICON: Record<AdminNoticeType, React.ReactNode> = {
  lead: <Inbox className="w-4 h-4" />,
  query: <MessageSquare className="w-4 h-4" />,
  payment: <CreditCard className="w-4 h-4" />,
  user: <UserCircle2 className="w-4 h-4" />,
};

export function NoticeRow({
  item,
  unread,
  onOpen,
}: {
  item: AdminNotice;
  unread?: boolean;
  onOpen: (item: AdminNotice) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full text-left px-5 py-3.5 flex gap-3 cursor-pointer hover:bg-[var(--admin-hover)] ${
        unread ? 'bg-[var(--admin-soft)]' : ''
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-[var(--admin-soft)] text-[var(--admin-muted)] flex items-center justify-center shrink-0">
        {ICON[item.type]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--admin-text)] leading-snug">{item.title}</p>
        {item.body && <p className="text-[12px] text-[var(--admin-muted)] mt-0.5 line-clamp-2">{item.body}</p>}
        <p className="text-[11px] text-[var(--admin-muted)] mt-1.5">{when(item.createdAt)}</p>
      </div>
      {unread && <span className="w-2 h-2 rounded-full bg-[var(--admin-accent)] shrink-0 mt-2" />}
    </button>
  );
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  items: AdminNotice[];
  unreadIds: Set<string>;
  onClose: () => void;
  onOpenItem: (item: AdminNotice) => void;
  onViewAll: () => void;
  onMarkAllRead: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  items,
  unreadIds,
  onClose,
  onOpenItem,
  onViewAll,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;
  const preview = items.slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Close notifications" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-md h-full bg-[var(--admin-sidebar)] shadow-[0_16px_60px_rgba(0,0,0,0.18)] border-l border-[var(--admin-border)] flex flex-col">
        <ModalA11y label="Notifications" onClose={onClose} />
        <div className="px-5 h-14 border-b border-[var(--admin-border)] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">Notifications</h2>
            <p className="text-[11px] text-[var(--admin-muted)]">
              {unreadIds.size > 0 ? `${unreadIds.size} unread` : 'You are up to date'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadIds.size > 0 && (
              <button type="button" onClick={onMarkAllRead} className="text-[12px] text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer">
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--admin-soft)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--admin-border)]">
          {preview.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--admin-soft)] text-[var(--admin-muted)] flex items-center justify-center mx-auto mb-3">
                <Bell className="w-4 h-4" />
              </div>
              <p className="text-[13px] text-[var(--admin-muted)]">No leads, payments, users, or queries yet.</p>
            </div>
          ) : (
            preview.map((item) => (
              <NoticeRow key={item.id} item={item} unread={unreadIds.has(item.id)} onOpen={onOpenItem} />
            ))
          )}
        </div>
        <div className="p-4 border-t border-[var(--admin-border)]">
          <button type="button" onClick={onViewAll} className="admin-btn w-full">
            View all notifications
          </button>
        </div>
      </aside>
    </div>
  );
};
