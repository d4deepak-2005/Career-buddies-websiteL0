import React from 'react';
import { X } from 'lucide-react';
import { ModalA11y } from '../common/ModalA11y';
import type { MentorSessionStatus } from '../../config/mentorPortalSampleData';

// Small building blocks for the Mentor Portal. Visual language is copied from the
// admin console (admin-* CSS variables / classes defined in index.css); nothing
// here imports or changes the admin components themselves.

const IST = 'Asia/Kolkata';

export function formatSessionDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function formatSessionTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .toUpperCase();
}

export function formatSessionRange(iso: string, durationMinutes: number): string {
  const end = new Date(new Date(iso).getTime() + durationMinutes * 60_000).toISOString();
  return `${formatSessionTime(iso)} – ${formatSessionTime(end)}`;
}

// "2026-10" style key (IST) used by the month filter.
export function monthKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit' }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  return `${y}-${m}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join('');
}

const STATUS_STYLE: Record<MentorSessionStatus, { tone: string; dot: string; label: string }> = {
  scheduled: { tone: 'admin-tone-info', dot: 'bg-[#2f5fbf]', label: 'Scheduled' },
  completed: { tone: 'admin-tone-ok', dot: 'bg-[#16a34a]', label: 'Completed' },
  cancelled: { tone: 'admin-tone-bad', dot: 'bg-[#dc2626]', label: 'Cancelled' },
};

export const StatusPill: React.FC<{ status: MentorSessionStatus }> = ({ status }) => {
  const s = STATUS_STYLE[status];
  return (
    <span className={`${s.tone} inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

export const SampleBadge: React.FC = () => (
  <span className="admin-tone-warn inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em]">
    Sample data
  </span>
);

// Admin-style card wrapper.
export const Panel: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  actions,
  children,
  className = '',
}) => (
  <section className={`bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] overflow-hidden ${className}`}>
    {(title || actions) && (
      <div className="px-5 min-h-12 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)]">
        {title && <h2 className="text-[13px] font-semibold text-[var(--admin-text)]">{title}</h2>}
        {actions}
      </div>
    )}
    {children}
  </section>
);

export const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon: React.ComponentType<{ className?: string }> }> = ({
  label,
  value,
  hint,
  icon: Icon,
}) => (
  <div className="bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">{label}</p>
      <span className="w-8 h-8 rounded-lg bg-[var(--admin-soft)] text-[var(--admin-muted)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </span>
    </div>
    <p className="mt-4 text-[28px] leading-none font-semibold tracking-tight text-[var(--admin-text)]">{value}</p>
    {hint && <p className="mt-2 text-[12px] text-[var(--admin-muted)]">{hint}</p>}
  </div>
);

// Simple dialog in the admin look. Rendered inside .admin-console so the admin CSS variables apply.
export const MentorDialog: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ title, subtitle, onClose, children, footer, wide }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/40 cursor-default" onClick={onClose} />
    <div
      className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] shadow-[0_12px_40px_rgba(0,0,0,0.18)]`}
    >
      <ModalA11y label={title} onClose={onClose} />
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-[var(--admin-border)]">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--admin-text)]">{title}</h3>
          {subtitle && <p className="text-[12px] text-[var(--admin-muted)] mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-md text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 py-4 overflow-y-auto flex-1 text-[13px] text-[var(--admin-text)]">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-[var(--admin-border)] flex flex-wrap justify-end gap-2">{footer}</div>}
    </div>
  </div>
);
