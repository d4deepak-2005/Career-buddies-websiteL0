import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react';
import type { CandidateProfile } from '../../utils/candidateAuth';
import type { MentorAvailabilitySlot, MentorSession } from '../../config/mentorPortalSampleData';
import { useMentorPortalData } from '../../hooks/useMentorPortalData';
import { MentorSessionsTable, type SessionAction } from './MentorSessionsTable';
import {
  MentorDialog,
  Panel,
  SampleBadge,
  StatCard,
  StatusPill,
  formatSessionDate,
  formatSessionRange,
  formatSessionTime,
  initials,
  monthKey,
} from './mentorUi';

// Exactly four navigation tabs; "profile" is reached from the header / account menu only.
type MentorTab = 'dashboard' | 'sessions' | 'candidates' | 'availability';
type MentorView = MentorTab | 'profile';

const TAB_LABELS: Record<MentorView, string> = {
  dashboard: 'Dashboard',
  sessions: 'My Sessions',
  candidates: 'My Candidates',
  availability: 'Availability',
  profile: 'My Profile',
};

const COLLAPSE_KEY = 'cb_mentor_sidebar_collapsed';

const THEME_KEY = 'cb_mentor_theme';
type MentorTheme = 'light' | 'dark';

function readTheme(): MentorTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

type DialogState =
  | { kind: 'profile'; candidateId: string }
  | { kind: 'join' | 'brief' | 'notes' | 'add-notes'; sessionId: string }
  | null;

interface MentorDashboardScreenProps {
  // The signed-in mentor account (null only in the local sample preview).
  account: CandidateProfile | null;
  onSignOut: () => void;
  onExitToSite: () => void;
}

export const MentorDashboardScreen: React.FC<MentorDashboardScreenProps> = ({ account, onSignOut, onExitToSite }) => {
  const { data, setData, loading, error, refresh } = useMentorPortalData();
  const [view, setView] = useState<MentorView>('dashboard');
  const [theme, setTheme] = useState<MentorTheme>(readTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [availabilityDraft, setAvailabilityDraft] = useState<MentorAvailabilitySlot[] | null>(null);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mentorName =
    (account && [account.firstName, account.lastName].filter(Boolean).join(' ').trim()) || data?.mentor.name || 'Mentor';

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  // Close the sidebar account menu on an outside click (same behaviour as the admin console).
  useEffect(() => {
    if (!accountOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-mentor-account]')) setAccountOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [accountOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const savedAvailability = data?.availability;
  useEffect(() => {
    if (savedAvailability) setAvailabilityDraft(savedAvailability.map((s) => ({ ...s })));
  }, [savedAvailability]);

  const candidatesById = useMemo(() => new Map((data?.candidates || []).map((c) => [c.id, c])), [data]);
  const sessionsById = useMemo(() => new Map((data?.sessions || []).map((s) => [s.id, s])), [data]);

  const nextSession = useMemo<MentorSession | null>(() => {
    const upcoming = (data?.sessions || [])
      .filter((s) => s.status === 'scheduled')
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const now = Date.now();
    return upcoming.find((s) => new Date(s.startsAt).getTime() + s.durationMinutes * 60_000 >= now) || upcoming[0] || null;
  }, [data]);

  const defaultMonth = useMemo(() => {
    const sessions = data?.sessions || [];
    const thisMonth = monthKey(new Date().toISOString());
    if (sessions.some((s) => monthKey(s.startsAt) === thisMonth)) return thisMonth;
    return nextSession ? monthKey(nextSession.startsAt) : 'all';
  }, [data, nextSession]);

  const pendingNotes = useMemo(
    () =>
      (data?.sessions || [])
        .filter((s) => s.status === 'completed' && !s.notesSubmitted)
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
    [data]
  );

  const openSessionAction = (action: SessionAction, session: MentorSession) => {
    if (action === 'profile') {
      setDialog({ kind: 'profile', candidateId: session.candidateId });
      return;
    }
    if (action === 'join' && session.meetingUrl) {
      window.open(session.meetingUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action === 'add-notes') setNotesDraft(session.notes || '');
    setDialog({ kind: action, sessionId: session.id });
  };

  const saveNotes = (sessionId: string) => {
    const text = notesDraft.trim();
    if (!text) return;
    setData((prev) =>
      prev
        ? { ...prev, sessions: prev.sessions.map((s) => (s.id === sessionId ? { ...s, notes: text, notesSubmitted: true } : s)) }
        : prev
    );
    setDialog(null);
  };

  const goView = (next: MentorView) => {
    setView(next);
    setMenuOpen(false);
    setAccountOpen(false);
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  };

  const isSample = !!data?.isSample;
  const currentLabel = TAB_LABELS[view];

  // ---------- Dialog content ----------
  const renderDialog = () => {
    if (!dialog || !data) return null;
    if (dialog.kind === 'profile') {
      const c = candidatesById.get(dialog.candidateId);
      if (!c) return null;
      const theirSessions = data.sessions
        .filter((s) => s.candidateId === c.id)
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      return (
        <MentorDialog
          title={c.name}
          subtitle={`${c.currentRole} · ${c.experience}`}
          onClose={() => setDialog(null)}
          wide
          footer={
            <button type="button" className="admin-btn" onClick={() => setDialog(null)}>
              Close
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['Email', c.email],
              ['Phone', c.phone || '—'],
              ['Current role', `${c.currentRole} (${c.experience})`],
              ['Target role', c.targetRole],
              ['Location', c.location || '—'],
              ['Resume', c.resumeAvailable ? 'Available' : 'Not uploaded yet'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[var(--admin-soft)] px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">{k}</p>
                <p className="text-[13px] text-[var(--admin-text)] mt-0.5 break-words">{v}</p>
              </div>
            ))}
          </div>
          {c.summary && <p className="mt-4 text-[13px] text-[var(--admin-text)] leading-relaxed">{c.summary}</p>}
          <h4 className="mt-5 mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">Sessions with you</h4>
          <ul className="flex flex-col divide-y divide-[var(--admin-border)] border border-[var(--admin-border)] rounded-xl">
            {theirSessions.map((s) => (
              <li key={s.id} className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-[13px] text-[var(--admin-text)]">
                    #{s.id} · {s.sessionType}
                  </span>
                  <span className="block text-[12px] text-[var(--admin-muted)]">
                    {formatSessionDate(s.startsAt)}, {formatSessionRange(s.startsAt, s.durationMinutes)}
                  </span>
                </span>
                <StatusPill status={s.status} />
              </li>
            ))}
          </ul>
        </MentorDialog>
      );
    }

    const s = sessionsById.get(dialog.sessionId);
    if (!s) return null;
    const c = candidatesById.get(s.candidateId);
    const when = `${formatSessionDate(s.startsAt)}, ${formatSessionRange(s.startsAt, s.durationMinutes)} IST`;

    if (dialog.kind === 'add-notes') {
      return (
        <MentorDialog
          title={`Session notes · ${c?.name || ''}`}
          subtitle={`#${s.id} · ${s.sessionType} · ${when}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="admin-btn" onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button type="button" className="admin-btn-primary" disabled={!notesDraft.trim()} onClick={() => saveNotes(s.id)}>
                <NotebookPen className="w-3.5 h-3.5" /> Submit notes
              </button>
            </>
          }
        >
          <label htmlFor="mentor-notes" className="block text-[12px] font-medium text-[var(--admin-text)] mb-1.5">
            What did you cover, and what are the candidate's next steps?
          </label>
          <textarea
            id="mentor-notes"
            rows={6}
            className="w-full"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Key discussion points, action items, follow-up date..."
          />
          {isSample && (
            <p className="mt-2 text-[12px] text-[var(--admin-muted)]">Sample data: notes are kept in this browser tab only.</p>
          )}
        </MentorDialog>
      );
    }

    const title =
      dialog.kind === 'join' ? `Join session · ${c?.name || ''}` : dialog.kind === 'brief' ? `Session brief · ${c?.name || ''}` : `Session notes · ${c?.name || ''}`;
    const body = dialog.kind === 'notes' ? s.notes : s.brief;
    return (
      <MentorDialog
        title={title}
        subtitle={`#${s.id} · ${s.sessionType} · ${when}`}
        onClose={() => setDialog(null)}
        footer={
          <button type="button" className="admin-btn" onClick={() => setDialog(null)}>
            Close
          </button>
        }
      >
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)] mb-1">Career goal</p>
        <p className="mb-4">{s.careerGoal}</p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)] mb-1">
          {dialog.kind === 'notes' ? 'Your notes' : 'Brief'}
        </p>
        <p className="leading-relaxed whitespace-pre-line">{body || 'Nothing added yet.'}</p>
        {dialog.kind === 'join' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>
              {isSample
                ? 'Sample data: no meeting link is attached to this session. With real data, Join opens the meeting link in a new tab.'
                : 'The meeting link for this session has not been added yet. Please check with the Career Buddies team.'}
            </span>
          </div>
        )}
      </MentorDialog>
    );
  };

  // ---------- Views ----------
  const renderDashboard = () => {
    if (!data) return null;
    const nextCandidate = nextSession ? candidatesById.get(nextSession.candidateId) : null;
    const firstPending = pendingNotes[0];
    const pendingCandidate = firstPending ? candidatesById.get(firstPending.candidateId) : null;
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Sessions Conducted" value={data.summary.totalSessionsConducted} hint="All time" icon={CalendarCheck2} />
          <StatCard label="Completed This Month" value={data.summary.completedThisMonth} hint="Sessions marked completed" icon={CheckCircle2} />
          <StatCard label="Upcoming Sessions" value={data.summary.upcomingSessions} hint="Scheduled with you" icon={CalendarClock} />
          <StatCard label="Assigned Candidates" value={data.summary.assignedCandidates} hint="Currently assigned to you" icon={Users} />
        </div>

        {nextSession && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-active)] px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-[var(--admin-sidebar)] text-[var(--admin-accent)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4" />
              </span>
              <p className="text-[13px] text-[var(--admin-text)] leading-relaxed">
                Next session: <strong className="font-semibold">{nextCandidate?.name}</strong>
                <span className="text-[var(--admin-muted)]"> • </span>
                <strong className="font-semibold">{nextSession.sessionType}</strong>
                <span className="text-[var(--admin-muted)]"> • </span>
                {formatSessionDate(nextSession.startsAt)}, {formatSessionTime(nextSession.startsAt)} IST
              </p>
            </div>
            <button type="button" className="admin-btn-primary self-start sm:self-auto" onClick={() => openSessionAction('join', nextSession)}>
              <Video className="w-3.5 h-3.5" /> Join Session
            </button>
          </div>
        )}

        <MentorSessionsTable
          sessions={data.sessions}
          candidatesById={candidatesById}
          nextSessionId={nextSession?.id || null}
          defaultMonth={defaultMonth}
          pageSize={4}
          refreshing={loading}
          onRefresh={refresh}
          onAction={openSessionAction}
        />

        {firstPending && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[13px] text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong className="font-semibold">Pending action:</strong> Submit session notes for {pendingCandidate?.name}
                {pendingNotes.length > 1 ? ` (+${pendingNotes.length - 1} more)` : ''}
              </span>
            </p>
            <button type="button" className="admin-btn-primary self-start sm:self-auto" onClick={() => openSessionAction('add-notes', firstPending)}>
              <NotebookPen className="w-3.5 h-3.5" /> Add Notes
            </button>
          </div>
        )}
      </>
    );
  };

  const renderCandidates = () => {
    if (!data) return null;
    const q = candidateQuery.trim().toLowerCase();
    const rows = data.candidates.filter((c) =>
      !q ? true : [c.name, c.email, c.currentRole, c.targetRole].some((v) => v.toLowerCase().includes(q))
    );
    return (
      <Panel
        title={`My Candidates (${data.candidates.length})`}
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[var(--admin-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              aria-label="Search candidates"
              type="text"
              placeholder="Search candidates..."
              value={candidateQuery}
              onChange={(e) => setCandidateQuery(e.target.value)}
              className="w-full"
              ref={(el) => el?.style.setProperty('padding-left', '2.5rem', 'important')}
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Current role</th>
                <th>Target role</th>
                <th>Sessions</th>
                <th>Next session</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[var(--admin-muted)] py-10">
                    No candidates match your search.
                  </td>
                </tr>
              )}
              {rows.map((c) => {
                const theirs = data.sessions.filter((s) => s.candidateId === c.id);
                const done = theirs.filter((s) => s.status === 'completed').length;
                const next = theirs
                  .filter((s) => s.status === 'scheduled')
                  .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[var(--admin-soft)] text-[11px] font-semibold text-[var(--admin-text)] flex items-center justify-center shrink-0">
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0">
                          <strong className="block text-[var(--admin-text)]">{c.name}</strong>
                          <span className="block text-[12px] text-[var(--admin-muted)]">{c.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="block text-[var(--admin-text)]">{c.currentRole}</span>
                      <span className="text-[12px] text-[var(--admin-muted)]">{c.experience}</span>
                    </td>
                    <td className="text-[var(--admin-text)]">{c.targetRole}</td>
                    <td className="text-[var(--admin-text)] whitespace-nowrap">
                      {done} completed / {theirs.length}
                    </td>
                    <td className="whitespace-nowrap">
                      {next ? (
                        <>
                          <span className="block text-[var(--admin-text)]">{formatSessionDate(next.startsAt)}</span>
                          <span className="text-[12px] text-[var(--admin-muted)]">{next.sessionType}</span>
                        </>
                      ) : (
                        <span className="text-[var(--admin-muted)]">—</span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="admin-btn" onClick={() => setDialog({ kind: 'profile', candidateId: c.id })}>
                        <UserRound className="w-3.5 h-3.5" /> View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  };

  const renderAvailability = () => {
    if (!data || !availabilityDraft) return null;
    const update = (i: number, patch: Partial<MentorAvailabilitySlot>) => {
      setAvailabilitySaved(false);
      setAvailabilityDraft((prev) => (prev ? prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) : prev));
    };
    const invalid = availabilityDraft.some((s) => s.enabled && s.start >= s.end);
    return (
      <Panel
        title="Weekly availability (IST)"
        actions={
          <div className="flex items-center gap-2">
            {availabilitySaved && <span className="text-[12px] text-[var(--admin-muted)]">Saved{isSample ? ' (this tab only)' : ''}</span>}
            <button
              type="button"
              className="admin-btn-primary"
              disabled={invalid}
              onClick={() => {
                setData((prev) => (prev ? { ...prev, availability: availabilityDraft.map((s) => ({ ...s })) } : prev));
                setAvailabilitySaved(true);
              }}
            >
              Save availability
            </button>
          </div>
        }
      >
        <ul className="divide-y divide-[var(--admin-border)]">
          {availabilityDraft.map((slot, i) => (
            <li key={slot.day} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="flex items-center gap-2.5 sm:w-48 cursor-pointer">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={(e) => update(i, { enabled: e.target.checked })}
                  className="w-4 h-4 accent-[var(--admin-accent)]"
                />
                <span className="text-[13px] font-medium text-[var(--admin-text)]">{slot.day}</span>
              </label>
              {slot.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${slot.day} start time`}
                    value={slot.start}
                    onChange={(e) => update(i, { start: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-[12px] text-[var(--admin-muted)]">to</span>
                  <input
                    type="time"
                    aria-label={`${slot.day} end time`}
                    value={slot.end}
                    onChange={(e) => update(i, { end: e.target.value })}
                    className="w-32"
                  />
                  {slot.start >= slot.end && <span className="text-[12px] text-red-700">End must be after start</span>}
                </div>
              ) : (
                <span className="text-[12px] text-[var(--admin-muted)]">Unavailable</span>
              )}
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 border-t border-[var(--admin-border)] text-[12px] text-[var(--admin-muted)]">
          Candidates are only offered slots inside these hours. Booked sessions are not affected by changes here.
        </p>
      </Panel>
    );
  };

  const renderProfile = () => {
    const fields: [string, string][] = account
      ? [
          ['Name', mentorName],
          ['Email', account.email],
          ['Designation', account.currentDesignation || '—'],
          ['Experience', account.totalExperience || '—'],
          ['LinkedIn', account.linkedinUrl || '—'],
          ['Member since', account.joinedAt ? formatSessionDate(account.joinedAt) : '—'],
        ]
      : [
          ['Name', data?.mentor.name || ''],
          ['Email', data?.mentor.email || ''],
          ['Designation', data?.mentor.title || ''],
          ['Expertise', (data?.mentor.expertise || []).join(', ')],
        ];
    return (
      <Panel title="My Profile">
        <div className="p-5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-[var(--admin-soft)] text-[14px] font-semibold text-[var(--admin-text)] flex items-center justify-center">
              {initials(mentorName)}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[var(--admin-text)]">{mentorName}</p>
              <p className="text-[12px] text-[var(--admin-muted)]">Career Buddies Mentor</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[var(--admin-soft)] px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">{k}</p>
                <p className="text-[13px] text-[var(--admin-text)] mt-0.5 break-words">{v}</p>
              </div>
            ))}
          </div>
          {account?.bio && <p className="text-[13px] text-[var(--admin-text)] leading-relaxed">{account.bio}</p>}
          <p className="text-[12px] text-[var(--admin-muted)]">
            {account ? 'These details come from your Career Buddies account. ' : 'Sample mentor shown in preview mode. '}
            To change your public mentor listing, contact the Career Buddies team.
          </p>
        </div>
      </Panel>
    );
  };

  const pageTitle: Record<MentorView, { title: string; subtitle: string }> = {
    dashboard: { title: 'Mentor Dashboard', subtitle: 'Your assigned candidates, sessions and follow-ups' },
    sessions: { title: 'My Sessions', subtitle: 'Every session assigned to you, with briefs and notes' },
    candidates: { title: 'My Candidates', subtitle: 'Candidates currently assigned to you' },
    availability: { title: 'Availability', subtitle: 'The weekly hours you are open for sessions' },
    profile: { title: 'My Profile', subtitle: 'Your mentor account details' },
  };

  // ---------- Layout (same shell pattern as the admin console: collapsible sidebar,
  // mobile drawer, sticky header, panel content area) ----------
  const navItems: { id: MentorTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sessions', label: 'My Sessions', icon: CalendarDays, badge: data?.sessions.length },
    { id: 'candidates', label: 'My Candidates', icon: Users, badge: data?.candidates.length },
    { id: 'availability', label: 'Availability', icon: Clock3 },
  ];

  const accountActions = [
    { label: 'My Profile', icon: UserRound, onClick: () => goView('profile') },
    { label: 'View website', icon: ExternalLink, onClick: onExitToSite },
    { label: account ? 'Sign out' : 'Exit preview', icon: LogOut, onClick: onSignOut },
  ];

  const renderSidebar = (collapsed: boolean, allowCollapse: boolean) => (
    <aside
      className={`h-full bg-[var(--admin-sidebar)] text-[var(--admin-text)] flex flex-col shrink-0 border-r border-[var(--admin-border)] transition-[width] duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[248px]'
      }`}
    >
      <div className={`border-b border-[var(--admin-border)] ${collapsed ? 'px-2 py-4' : 'px-4 py-4'}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col gap-3' : 'gap-2.5'}`}>
          <div className="w-8 h-8 rounded-lg bg-[var(--admin-soft)] text-[var(--admin-text)] text-[11px] font-semibold tracking-wide flex items-center justify-center shrink-0">
            CB
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--admin-text)] leading-tight tracking-tight">Career Buddies</p>
              <p className="text-[11px] text-[var(--admin-muted)]">Mentor Portal</p>
            </div>
          )}
          {allowCollapse && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="p-1.5 rounded-md text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`} aria-label="Mentor Portal">
        {!collapsed && (
          <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Mentor workspace</p>
        )}
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const on = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goView(item.id)}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={on ? 'page' : undefined}
                className={`relative w-full flex items-center rounded-md text-[13px] cursor-pointer ${
                  collapsed ? 'justify-center h-9' : 'gap-2.5 px-2.5 h-9 text-left'
                } ${
                  on
                    ? 'bg-[var(--admin-active)] text-[var(--admin-text)]'
                    : 'text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]'
                }`}
              >
                {on && !collapsed && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--admin-accent)]" />}
                <Icon className={`w-[16px] h-[16px] shrink-0 ${on ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-muted)]'}`} />
                {!collapsed && <span className="flex-1 font-medium">{item.label}</span>}
                {!collapsed && typeof item.badge === 'number' && (
                  <span
                    className={`min-w-[20px] px-1.5 py-0.5 rounded text-[10px] font-medium text-center bg-[var(--admin-soft)] ${
                      on ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-muted)]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
      <div data-mentor-account className={`relative border-t border-[var(--admin-border)] ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {accountOpen && (
          <div
            role="menu"
            className={`absolute z-30 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] shadow-[0_12px_40px_rgba(0,0,0,0.12)] py-1.5 ${
              collapsed ? 'left-full bottom-3 ml-2 w-48' : 'left-3 right-3 bottom-full mb-2'
            }`}
          >
            {accountActions.map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false);
                  onClick();
                }}
                className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-[var(--admin-text)] hover:bg-[var(--admin-hover)] cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setAccountOpen((open) => !open)}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
          title={mentorName}
          className={`w-full flex items-center rounded-xl bg-[var(--admin-soft)] hover:bg-[var(--admin-hover)] cursor-pointer ${
            collapsed ? 'justify-center h-10' : 'gap-2.5 px-2.5 h-12'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--admin-page)] text-[var(--admin-text)] text-[11px] font-semibold flex items-center justify-center shrink-0">
            {initials(mentorName)}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[13px] font-medium text-[var(--admin-text)] truncate">{mentorName}</p>
                <p className="text-[11px] text-[var(--admin-muted)]">Mentor</p>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--admin-muted)] shrink-0" />
            </>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <div className={`admin-console admin-theme-${theme} w-full min-h-screen flex`}>
      <div className="hidden lg:block sticky top-0 h-screen">{renderSidebar(sidebarCollapsed, true)}</div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full">{renderSidebar(false, false)}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-[var(--admin-header)] backdrop-blur border-b border-[var(--admin-border)] px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="lg:hidden p-2 rounded-lg border border-[var(--admin-border)] text-[var(--admin-text)] cursor-pointer"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="min-w-0">
              <p className="text-[15px] text-[var(--admin-text)] truncate">
                <span className="font-semibold">Career Buddies</span>
                <span className="text-[var(--admin-muted)]"> | Mentor Portal</span>
              </p>
              <p className="text-[11px] text-[var(--admin-muted)] hidden sm:block">{currentLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center rounded-lg border border-[var(--admin-border)] p-0.5 bg-[var(--admin-soft)]" role="group" aria-label="Theme">
              {(['light', 'dark'] as MentorTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  aria-label={t === 'light' ? 'Light theme' : 'Dark theme'}
                  className={`p-1.5 rounded-md cursor-pointer ${
                    theme === t ? 'bg-[var(--admin-sidebar)] text-[var(--admin-text)] shadow-xs' : 'text-[var(--admin-muted)]'
                  }`}
                >
                  {t === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--admin-soft)] hover:bg-[var(--admin-hover)] cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full bg-[var(--admin-page)] text-[10px] font-semibold text-[var(--admin-text)] flex items-center justify-center">
                  {initials(mentorName)}
                </span>
                <span className="hidden sm:block text-[13px] font-medium text-[var(--admin-text)] truncate max-w-[160px]">{mentorName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1.5 w-56 z-30 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] shadow-[0_12px_40px_rgba(0,0,0,0.12)] py-1.5"
                >
                  <div className="px-3 py-2 border-b border-[var(--admin-border)] mb-1">
                    <p className="text-[13px] font-medium text-[var(--admin-text)] truncate">{mentorName}</p>
                    <p className="text-[11px] text-[var(--admin-muted)] truncate">{account?.email || data?.mentor.email}</p>
                  </div>
                  {accountActions.map(({ label, icon: Icon, onClick }) => (
                    <button
                      key={label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-[var(--admin-text)] hover:bg-[var(--admin-hover)] cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="admin-btn" onClick={() => goView('profile')}>
              <UserRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Profile</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-[var(--admin-text)]">{pageTitle[view].title}</h1>
              <p className="text-[13px] text-[var(--admin-muted)] mt-0.5">{pageTitle[view].subtitle}</p>
            </div>
            {isSample && view !== 'profile' && <SampleBadge />}
          </div>

          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button type="button" className="admin-btn" onClick={refresh}>
                Try again
              </button>
            </div>
          )}

          {!data && loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[118px] rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] animate-pulse" />
              ))}
            </div>
          )}

          {data && view === 'dashboard' && renderDashboard()}
          {data && view === 'sessions' && (
            <MentorSessionsTable
              title="All sessions"
              sessions={data.sessions}
              candidatesById={candidatesById}
              nextSessionId={nextSession?.id || null}
              defaultMonth="all"
              pageSize={8}
              refreshing={loading}
              onRefresh={refresh}
              onAction={openSessionAction}
            />
          )}
          {data && view === 'candidates' && renderCandidates()}
          {data && view === 'availability' && renderAvailability()}
          {view === 'profile' && renderProfile()}

          {isSample && (
            <p className="text-[12px] text-[var(--admin-muted)] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Sample data • Each mentor sees only their assigned candidates and sessions
            </p>
          )}
        </div>
      </div>

      {renderDialog()}
    </div>
  );

};
