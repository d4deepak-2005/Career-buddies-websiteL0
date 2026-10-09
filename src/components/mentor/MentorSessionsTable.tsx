import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, NotebookPen, RefreshCw, Search, UserRound, Video } from 'lucide-react';
import type { MentorCandidate, MentorSession, MentorSessionStatus } from '../../config/mentorPortalSampleData';
import { Panel, StatusPill, formatSessionDate, formatSessionRange, monthKey, monthLabel } from './mentorUi';

export type SessionAction = 'profile' | 'join' | 'brief' | 'notes' | 'add-notes';

interface MentorSessionsTableProps {
  title?: string;
  sessions: MentorSession[];
  candidatesById: Map<string, MentorCandidate>;
  nextSessionId: string | null;
  defaultMonth: string; // "2026-10" or "all"
  pageSize?: number;
  refreshing?: boolean;
  onRefresh: () => void;
  onAction: (action: SessionAction, session: MentorSession) => void;
}

export const MentorSessionsTable: React.FC<MentorSessionsTableProps> = ({
  title = 'My Sessions',
  sessions,
  candidatesById,
  nextSessionId,
  defaultMonth,
  pageSize = 4,
  refreshing,
  onRefresh,
  onAction,
}) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | MentorSessionStatus>('all');
  const [month, setMonth] = useState(defaultMonth);
  const [page, setPage] = useState(1);

  const months = useMemo(
    () => Array.from(new Set(sessions.map((s) => monthKey(s.startsAt)))).sort().reverse(),
    [sessions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .filter((s) => (status === 'all' ? true : s.status === status))
      .filter((s) => (month === 'all' ? true : monthKey(s.startsAt) === month))
      .filter((s) => {
        if (!q) return true;
        const c = candidatesById.get(s.candidateId);
        return [s.id, s.sessionType, s.careerGoal, c?.name, c?.email, c?.currentRole]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  }, [sessions, candidatesById, query, status, month]);

  useEffect(() => setPage(1), [query, status, month]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <Panel title={title}>
      <div className="px-5 py-4 flex flex-col lg:flex-row gap-3 justify-between lg:items-center border-b border-[var(--admin-border)]">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[var(--admin-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            aria-label="Search candidate or session"
            type="text"
            placeholder="Search candidate or session..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
            // The shared admin input style sets padding with !important; make room for the icon.
            ref={(el) => el?.style.setProperty('padding-left', '2.5rem', 'important')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as any)} className="flex-1 sm:flex-none">
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select aria-label="Filter by month" value={month} onChange={(e) => setMonth(e.target.value)} className="flex-1 sm:flex-none">
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <button type="button" onClick={onRefresh} disabled={refreshing} className="admin-btn">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[980px]">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>Candidate</th>
              <th>Role &amp; experience</th>
              <th>Session &amp; career goal</th>
              <th>Date &amp; time (IST)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[var(--admin-muted)] py-10">
                  No sessions match these filters.
                </td>
              </tr>
            )}
            {rows.map((s) => {
              const c = candidatesById.get(s.candidateId);
              return (
                <tr key={s.id} className="hover:bg-[var(--admin-hover)]">
                  <td className="text-[var(--admin-muted)] whitespace-nowrap">#{s.id}</td>
                  <td>
                    <strong className="text-[var(--admin-text)] font-semibold block">{c?.name || 'Unknown candidate'}</strong>
                    <span className="text-[var(--admin-muted)] text-[12px] block">{c?.email}</span>
                    {c?.resumeAvailable ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-[var(--admin-accent)]">
                        <FileText className="w-3 h-3" /> Resume available
                      </span>
                    ) : (
                      <span className="text-[12px] text-[var(--admin-muted)]">No resume yet</span>
                    )}
                  </td>
                  <td>
                    <span className="text-[var(--admin-text)] block">{c?.currentRole || '—'}</span>
                    <span className="text-[var(--admin-muted)] text-[12px]">{c?.experience || ''}</span>
                  </td>
                  <td className="max-w-xs">
                    <span className="text-[var(--admin-text)] block">{s.sessionType}</span>
                    <span className="text-[var(--admin-muted)] text-[12px]">{s.careerGoal}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="text-[var(--admin-text)] block">{formatSessionDate(s.startsAt)}</span>
                    <span className="text-[var(--admin-muted)] text-[12px]">{formatSessionRange(s.startsAt, s.durationMinutes)}</span>
                  </td>
                  <td>
                    <StatusPill status={s.status} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button type="button" className="admin-btn" onClick={() => onAction('profile', s)}>
                        <UserRound className="w-3.5 h-3.5" /> View Profile
                      </button>
                      {s.status === 'scheduled' && s.id === nextSessionId && (
                        <button type="button" className="admin-btn-primary min-w-[96px]" onClick={() => onAction('join', s)}>
                          <Video className="w-3.5 h-3.5" /> Join
                        </button>
                      )}
                      {s.status === 'scheduled' && s.id !== nextSessionId && (
                        <button type="button" className="admin-btn min-w-[96px]" onClick={() => onAction('brief', s)}>
                          <FileText className="w-3.5 h-3.5" /> View Brief
                        </button>
                      )}
                      {s.status === 'completed' && s.notesSubmitted && (
                        <button type="button" className="admin-btn min-w-[96px]" onClick={() => onAction('notes', s)}>
                          <FileText className="w-3.5 h-3.5" /> View Notes
                        </button>
                      )}
                      {s.status === 'completed' && !s.notesSubmitted && (
                        <button type="button" className="admin-btn min-w-[96px]" onClick={() => onAction('add-notes', s)}>
                          <NotebookPen className="w-3.5 h-3.5" /> Add Notes
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--admin-border)]">
        <p className="text-[12px] text-[var(--admin-muted)]">
          Showing {rows.length} of {filtered.length} session{filtered.length === 1 ? '' : 's'}
        </p>
        <nav className="flex items-center gap-1" aria-label="Sessions pagination">
          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[var(--admin-text)] hover:bg-[var(--admin-hover)] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === current ? 'page' : undefined}
              className={`h-8 min-w-8 px-2 rounded-lg text-[12px] font-medium cursor-pointer ${
                n === current
                  ? 'bg-[var(--admin-active)] text-[var(--admin-accent)] border border-[var(--admin-accent)]/30'
                  : 'text-[var(--admin-text)] hover:bg-[var(--admin-hover)]'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[var(--admin-text)] hover:bg-[var(--admin-hover)] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            disabled={current >= pageCount}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      </div>
    </Panel>
  );
};
