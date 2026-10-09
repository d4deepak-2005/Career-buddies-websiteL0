import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Inbox, Mail, Pencil, RefreshCw, Search, Send, UserCheck, Users, X } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { Skeleton } from '../../common/Skeleton';

type MailView = 'inbox' | 'sent' | 'compose';
type Audience = 'one' | 'selected';
type RecipientSource = 'leads' | 'users';

const MAIL_TEMPLATES = [
  {
    id: 'default',
    label: 'Default professional',
    accent: '#006e29',
    hint: 'Clean advisory mail',
    subject: 'CareerBuddies | Next steps for your career plan',
    body: `Hi,

Thank you for connecting with CareerBuddies.

We have reviewed your request and would be happy to help you choose the right next step for your career goals. Our team can support you with a structured plan, practical guidance, and the right mentor or counsellor based on your current stage.

Please reply to this email with a convenient time to connect, and we will take it forward from there.

Regards,
CareerBuddies Team`,
  },
  {
    id: 'lead-follow-up',
    label: 'Lead follow-up',
    accent: '#2f5fbf',
    hint: 'For new enquiries',
    subject: 'Following up on your CareerBuddies enquiry',
    body: `Hi,

Thank you for sharing your details with CareerBuddies.

We noticed your interest in career guidance and wanted to follow up personally. To recommend the right path, it would help us understand your current role, experience, target role, and the main challenge you want to solve right now.

Please reply with these details, or share a suitable time for a quick discussion.

Regards,
CareerBuddies Team`,
  },
  {
    id: 'counselling-next-steps',
    label: 'Counselling next steps',
    accent: '#006e29',
    hint: 'Session confirmation flow',
    subject: 'Your CareerBuddies counselling next steps',
    body: `Hi,

Thank you for choosing CareerBuddies for your career counselling.

The next step is to confirm your preferred time slot and the goal you want to focus on during the session. Once we have that, we will align the discussion around your profile, current challenges, and the outcome you want from the session.

Please reply with your availability and any context you would like us to review before the call.

Regards,
CareerBuddies Team`,
  },
  {
    id: 'programme-update',
    label: 'Programme or webinar update',
    accent: '#7a4b00',
    hint: 'Broadcast style update',
    subject: 'CareerBuddies programme update',
    body: `Hi,

We are reaching out with an update from CareerBuddies.

Based on your interest, we wanted to share that our latest career guidance options are designed to help professionals make clearer decisions, prepare stronger applications, and move with more confidence toward their target roles.

If you would like details about the right programme, webinar, or counselling option for your profile, reply to this email and our team will guide you.

Regards,
CareerBuddies Team`,
  },
] as const;

type TemplateKey = (typeof MAIL_TEMPLATES)[number]['id'];

interface InboxRow {
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  seen: boolean;
}

interface SentRow {
  id: string;
  to: string;
  subject: string;
  body: string;
  audience: string;
  status: string;
  error: string;
  actorName: string;
  createdAt: string;
}

interface RecipientRow {
  id: string;
  source: RecipientSource;
  name: string;
  email: string;
  meta: string;
  mobile: string;
  createdAt: string;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatFull(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function displayName(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return 'Unknown';
  const match = value.match(/^([^<]+)</);
  return (match?.[1] || value.split('@')[0] || value).replace(/"/g, '').trim() || value;
}

function initials(raw: string) {
  const name = displayName(raw);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'M';
}

function recipientKey(row: RecipientRow) {
  return `${row.source}:${row.id}`;
}

function uniqueEmails(rows: RecipientRow[]) {
  return [...new Set(rows.map((row) => row.email.trim().toLowerCase()).filter(Boolean))];
}

function templateById(id: TemplateKey) {
  return MAIL_TEMPLATES.find((template) => template.id === id) || MAIL_TEMPLATES[0];
}

function MessageView({ title, person, detail, when, body }: { title: string; person: string; detail: string; when: string; body: string }) {
  return (
    <div className="p-6">
      <h3 className="text-[22px] font-normal text-[var(--admin-text)] tracking-tight">{title || '(No subject)'}</h3>
      <div className="mt-5 flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-[var(--admin-soft)] text-[12px] font-semibold text-[var(--admin-text)] flex items-center justify-center shrink-0">
          {initials(person)}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[var(--admin-text)] break-words">{displayName(person)}</p>
          <p className="text-[12px] text-[var(--admin-muted)] break-words">{person}</p>
          <p className="text-[12px] text-[var(--admin-muted)]">{detail}</p>
        </div>
        <p className="ml-auto text-[12px] text-[var(--admin-muted)] shrink-0">{formatFull(when)}</p>
      </div>
      <div className="mt-6 text-[14px] leading-7 text-[var(--admin-text)] whitespace-pre-wrap break-words">
        {body}
      </div>
    </div>
  );
}

export const MailPanel: React.FC = () => {
  const [view, setView] = useState<MailView>('inbox');
  const [status, setStatus] = useState({ smtp: false, imap: false, from: '', inboxUser: '', imapHost: '' });
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [sent, setSent] = useState<SentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openUid, setOpenUid] = useState<number | null>(null);
  const [openSent, setOpenSent] = useState<SentRow | null>(null);
  const [reading, setReading] = useState<{ subject: string; from: string; to: string; date: string; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState<Audience>('one');
  const [to, setTo] = useState('');
  const [templateKey, setTemplateKey] = useState<TemplateKey>('default');
  const [subject, setSubject] = useState<string>(MAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState<string>(MAIL_TEMPLATES[0].body);
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipientSource, setRecipientSource] = useState<RecipientSource>('leads');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientRow[]>([]);

  const selectedEmails = useMemo(() => uniqueEmails(selectedRecipients), [selectedRecipients]);

  const filteredInbox = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((row) => `${row.from} ${row.to} ${row.subject}`.toLowerCase().includes(q));
  }, [inbox, search]);

  const filteredSent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sent;
    return sent.filter((row) => `${row.to} ${row.subject} ${row.body} ${row.audience} ${row.status}`.toLowerCase().includes(q));
  }, [sent, search]);

  const loadStatus = useCallback(async () => {
    const res = await adminFetch('/api/admin/mail/status');
    const data = await res.json().catch(() => ({}));
    if (data?.success) {
      setStatus({
        smtp: !!data.smtp,
        imap: !!data.imap,
        from: String(data.from || ''),
        inboxUser: String(data.inboxUser || ''),
        imapHost: String(data.imapHost || ''),
      });
    }
  }, []);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/mail/inbox');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not load inbox.');
        setInbox([]);
        return;
      }
      setInbox(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Could not reach the server.');
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/mail/sent');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not load sent mail.');
        setSent([]);
        return;
      }
      setSent(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Could not reach the server.');
      setSent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    setOpenUid(null);
    setOpenSent(null);
    setReading(null);
    setError('');
    setFlash('');
    setSearch('');
    if (view === 'inbox') loadInbox();
    if (view === 'sent') loadSent();
    if (view === 'compose') setLoading(false);
  }, [view, loadInbox, loadSent]);

  useEffect(() => {
    if (!pickerOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRecipientsLoading(true);
      setRecipientError('');
      try {
        const params = new URLSearchParams({ source: recipientSource });
        if (recipientSearch.trim()) params.set('search', recipientSearch.trim());
        const res = await adminFetch(`/api/admin/mail/recipients?${params.toString()}`, { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setRecipientError(data.error || 'Could not load recipients.');
          setRecipients([]);
          return;
        }
        setRecipients(Array.isArray(data.items) ? data.items : []);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setRecipientError('Could not load recipients.');
          setRecipients([]);
        }
      } finally {
        if (!controller.signal.aborted) setRecipientsLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [pickerOpen, recipientSearch, recipientSource]);

  const openInbox = async (uid: number) => {
    setOpenUid(uid);
    setReading(null);
    try {
      const res = await adminFetch(`/api/admin/mail/inbox/${uid}`);
      const data = await res.json().catch(() => ({}));
      if (data?.item) setReading(data.item);
      else setError(data.error || 'Could not open this message.');
    } catch {
      setError('Could not open this message.');
    }
  };

  const toggleRecipient = (row: RecipientRow) => {
    const key = recipientKey(row);
    setSelectedRecipients((prev) => (
      prev.some((item) => recipientKey(item) === key)
        ? prev.filter((item) => recipientKey(item) !== key)
        : [...prev, row]
    ));
  };

  const allVisibleSelected = recipients.length > 0 && recipients.every((row) => selectedRecipients.some((item) => recipientKey(item) === recipientKey(row)));

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visible = new Set(recipients.map(recipientKey));
      setSelectedRecipients((prev) => prev.filter((item) => !visible.has(recipientKey(item))));
      return;
    }
    setSelectedRecipients((prev) => {
      const existing = new Set(prev.map(recipientKey));
      return [...prev, ...recipients.filter((row) => !existing.has(recipientKey(row)))];
    });
  };

  const removeRecipient = (key: string) => {
    setSelectedRecipients((prev) => prev.filter((item) => recipientKey(item) !== key));
  };

  const applyTemplate = (id: TemplateKey) => {
    const template = templateById(id);
    setTemplateKey(template.id);
    setSubject(template.subject);
    setBody(template.body);
  };

  const handleSend = async () => {
    setSending(true);
    setError('');
    setFlash('');
    try {
      if (audience === 'selected' && selectedEmails.length === 0) {
        setError('Choose at least one recipient.');
        return;
      }
      const res = await adminFetch(audience === 'one' ? '/api/admin/mail/send' : '/api/admin/mail/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: audience === 'one' ? 'one' : 'selected',
          to,
          emails: selectedEmails.join(','),
          templateKey,
          subject,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not send.');
        return;
      }
      setFlash(audience === 'one' ? 'Message sent.' : `Sent ${data.sent || 0} of ${data.total || 0}${data.failed ? `, ${data.failed} failed` : ''}.`);
      applyTemplate('default');
      setTo('');
      setSelectedRecipients([]);
      setAudience('one');
    } catch {
      setError('Could not send.');
    } finally {
      setSending(false);
    }
  };

  const refreshCurrent = () => {
    if (view === 'inbox') loadInbox();
    if (view === 'sent') loadSent();
  };

  const renderList = () => {
    if (view === 'inbox') {
      return inbox.length === 0 ? (
        <p className="p-10 text-center text-[13px] text-[var(--admin-muted)]">
          {status.imap ? 'Inbox is empty.' : 'IMAP is not configured yet.'}
        </p>
      ) : filteredInbox.length === 0 ? (
        <p className="p-10 text-center text-[13px] text-[var(--admin-muted)]">No inbox messages match this search.</p>
      ) : (
        filteredInbox.map((row) => {
          const on = openUid === row.uid;
          return (
            <button
              key={row.uid}
              type="button"
              onClick={() => openInbox(row.uid)}
              className={`w-full px-4 py-3 flex items-start gap-3 text-left cursor-pointer border-b border-[var(--admin-border)] last:border-b-0 ${
                on ? 'bg-[var(--admin-active)]' : 'hover:bg-[var(--admin-hover)]'
              }`}
            >
              <span className="w-9 h-9 mt-0.5 rounded-lg bg-[var(--admin-soft)] text-[11px] font-semibold text-[var(--admin-text)] flex items-center justify-center shrink-0">
                {initials(row.from)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`truncate text-[13px] ${row.seen ? 'font-medium' : 'font-semibold'} text-[var(--admin-text)]`}>
                    {displayName(row.from)}
                  </span>
                  <span className="ml-auto text-[11px] text-[var(--admin-muted)] shrink-0">{formatWhen(row.date)}</span>
                </span>
                <span className="block text-[13px] text-[var(--admin-text)] truncate mt-0.5">{row.subject || '(No subject)'}</span>
              </span>
            </button>
          );
        })
      );
    }

    return sent.length === 0 ? (
      <p className="p-10 text-center text-[13px] text-[var(--admin-muted)]">No sent mail yet.</p>
    ) : filteredSent.length === 0 ? (
      <p className="p-10 text-center text-[13px] text-[var(--admin-muted)]">No sent messages match this search.</p>
    ) : (
      filteredSent.map((row) => {
        const on = openSent?.id === row.id;
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => setOpenSent(row)}
            className={`w-full px-4 py-3 flex items-start gap-3 text-left cursor-pointer border-b border-[var(--admin-border)] last:border-b-0 ${
              on ? 'bg-[var(--admin-active)]' : 'hover:bg-[var(--admin-hover)]'
            }`}
          >
            <span className="w-9 h-9 mt-0.5 rounded-lg bg-[var(--admin-soft)] text-[11px] font-semibold text-[var(--admin-text)] flex items-center justify-center shrink-0">
              {initials(row.to)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-[var(--admin-text)]">To {displayName(row.to)}</span>
                <span className="ml-auto text-[11px] text-[var(--admin-muted)] shrink-0">{formatWhen(row.createdAt)}</span>
              </span>
              <span className="block text-[13px] text-[var(--admin-text)] truncate mt-0.5">{row.subject || '(No subject)'}</span>
            </span>
          </button>
        );
      })
    );
  };

  return (
    <div className="relative bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] overflow-hidden min-h-[680px] flex">
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-[var(--admin-border)] py-4">
        <div className="px-3 mb-4">
          <button type="button" onClick={() => setView('compose')} className="admin-btn-primary w-full">
            <Pencil className="w-4 h-4" />
            Compose
          </button>
        </div>
        {[
          { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: inbox.length },
          { id: 'sent' as const, label: 'Sent', icon: Mail, count: sent.length },
        ].map((item) => {
          const Icon = item.icon;
          const on = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`mx-2 h-9 px-3 rounded-md text-[13px] cursor-pointer flex items-center gap-2.5 ${
                on ? 'bg-[var(--admin-active)] text-[var(--admin-text)] font-semibold' : 'text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]'
              }`}
            >
              <Icon className={`w-4 h-4 ${on ? 'text-[var(--admin-accent)]' : ''}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && <span className="text-[11px] text-[var(--admin-muted)]">{item.count}</span>}
            </button>
          );
        })}
        <div className="mt-auto px-4 pt-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">Mailbox</p>
          <p className="mt-1 text-[12px] text-[var(--admin-text)] truncate" title={status.inboxUser || status.from}>
            {status.inboxUser || status.from || 'Not connected'}
          </p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="md:hidden flex items-center gap-1">
            {(['inbox', 'sent', 'compose'] as MailView[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`h-8 px-3 rounded-md text-[12px] cursor-pointer ${
                  view === id ? 'bg-[var(--admin-active)] font-semibold' : 'hover:bg-[var(--admin-hover)]'
                }`}
              >
                {id === 'inbox' ? 'Inbox' : id === 'sent' ? 'Sent' : 'Compose'}
              </button>
            ))}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[var(--admin-text)]">
              {view === 'inbox' ? 'Inbox' : view === 'sent' ? 'Sent mail' : 'New message'}
            </p>
            <p className="text-[11px] text-[var(--admin-muted)]">
              {view === 'compose' ? 'Send one email or choose Leads/Users for bulk.' : `${view === 'inbox' ? filteredInbox.length : filteredSent.length} visible`}
            </p>
          </div>
          {view !== 'compose' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-[var(--admin-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  aria-label={`Search ${view}`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={view === 'inbox' ? 'Search inbox...' : 'Search sent mail...'}
                  className="w-full pl-10 pr-3"
                />
              </div>
              <button type="button" onClick={refreshCurrent} className="admin-btn" aria-label="Refresh">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          )}
        </div>

        {error && <p className="px-4 py-2 text-[13px] text-red-700">{error}</p>}
        {flash && <p className="px-4 py-2 text-[13px] text-[#0b6b2b]">{flash}</p>}

        {view === 'compose' && (
          <div className="flex-1 p-4 sm:p-5">
            <div className="h-full min-h-[520px] rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] overflow-hidden flex flex-col">
              <div className="px-4 sm:px-5 py-4 border-b border-[var(--admin-border)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-[var(--admin-text)]">Compose email</p>
                  <p className="text-[12px] text-[var(--admin-muted)]">From {status.from || 'SMTP not set'}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] p-0.5">
                    {[
                      { id: 'one' as const, label: 'Single' },
                      { id: 'selected' as const, label: 'Bulk selected' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAudience(item.id)}
                        className={`h-8 px-3 rounded-md text-[12px] font-medium cursor-pointer ${
                          audience === item.id ? 'bg-[var(--admin-sidebar)] text-[var(--admin-text)] shadow-sm' : 'text-[var(--admin-muted)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => { setAudience('selected'); setPickerOpen(true); }} className="admin-btn">
                    <Users className="w-3.5 h-3.5" />
                    Recipients
                    {selectedEmails.length > 0 && <span className="text-[11px] text-[var(--admin-muted)]">({selectedEmails.length})</span>}
                  </button>
                </div>
              </div>

              <div className="px-4 sm:px-5 py-4 flex flex-col gap-3">
                <div className="grid grid-cols-1 lg:grid-cols-[96px_minmax(0,1fr)] gap-2 lg:items-center">
                  <p className="text-[12px] font-medium text-[var(--admin-muted)]">Template</p>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <select
                      value={templateKey}
                      onChange={(event) => applyTemplate(event.target.value as TemplateKey)}
                      aria-label="Email template"
                      className="w-full"
                    >
                      {MAIL_TEMPLATES.map((template) => (
                        <option key={template.id} value={template.id}>{template.label}</option>
                      ))}
                    </select>
                    <span className="hidden sm:inline-flex h-[38px] items-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 text-[12px] text-[var(--admin-muted)]">
                      Editable after selection
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[96px_minmax(0,1fr)] gap-2 lg:items-start">
                  <p className="text-[12px] font-medium text-[var(--admin-muted)] pt-2.5">To</p>
                  {audience === 'one' ? (
                    <input className="w-full" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
                  ) : (
                    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] min-h-[42px] px-3 py-2 flex flex-wrap items-center gap-2">
                      {selectedRecipients.length === 0 ? (
                        <button type="button" onClick={() => setPickerOpen(true)} className="text-[13px] text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer">
                          Choose leads or users
                        </button>
                      ) : (
                        selectedRecipients.slice(0, 8).map((row) => (
                          <span key={recipientKey(row)} className="inline-flex items-center gap-1.5 max-w-full rounded-md bg-[var(--admin-sidebar)] border border-[var(--admin-border)] px-2 py-1 text-[12px] text-[var(--admin-text)]">
                            <span className="truncate max-w-[180px]">{row.name || row.email}</span>
                            <button type="button" onClick={() => removeRecipient(recipientKey(row))} className="text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer" aria-label={`Remove ${row.email}`}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                      {selectedRecipients.length > 8 && (
                        <span className="text-[12px] text-[var(--admin-muted)]">+{selectedRecipients.length - 8} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[96px_minmax(0,1fr)] gap-2 lg:items-center">
                  <p className="text-[12px] font-medium text-[var(--admin-muted)]">Subject</p>
                  <input className="w-full" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
                </div>
              </div>

              <div className="flex-1 px-4 sm:px-5 pb-4">
                <textarea
                  className="w-full min-h-[300px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                />
              </div>

              <div className="px-4 sm:px-5 py-3 border-t border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[12px] text-[var(--admin-muted)]">
                  {audience === 'one' ? 'Single recipient' : `${selectedEmails.length} selected recipient${selectedEmails.length === 1 ? '' : 's'}`}
                </p>
                <div className="flex items-center gap-3">
                  {!status.smtp && <p className="text-[12px] text-[var(--admin-muted)]">SMTP is not configured.</p>}
                  <button type="button" onClick={handleSend} disabled={sending || !status.smtp} className="admin-btn-primary">
                    <Send className="w-3.5 h-3.5" />
                    {sending ? 'Sending...' : 'Send email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view !== 'compose' && loading && (
          <div className="p-4 flex flex-col gap-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        )}

        {view !== 'compose' && !loading && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] min-h-0">
            <div className="border-r border-[var(--admin-border)] overflow-y-auto max-h-[70vh]">
              {renderList()}
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              {view === 'inbox' && (!reading ? (
                <div className="h-full min-h-[280px] flex items-center justify-center text-[13px] text-[var(--admin-muted)]">
                  Select a conversation
                </div>
              ) : (
                <MessageView title={reading.subject} person={reading.from} detail={`to ${reading.to || 'me'}`} when={reading.date} body={reading.text} />
              ))}
              {view === 'sent' && (!openSent ? (
                <div className="h-full min-h-[280px] flex items-center justify-center text-[13px] text-[var(--admin-muted)]">
                  Select a sent message
                </div>
              ) : (
                <MessageView title={openSent.subject} person={`To ${openSent.to}`} detail={openSent.status || 'sent'} when={openSent.createdAt} body={openSent.body} />
              ))}
            </div>
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="absolute inset-0 z-30 flex justify-end">
          <button type="button" className="absolute inset-0 bg-black/25 cursor-default" aria-label="Close recipients" onClick={() => setPickerOpen(false)} />
          <aside className="relative z-10 w-full max-w-md h-full bg-[var(--admin-sidebar)] border-l border-[var(--admin-border)] shadow-[0_16px_60px_rgba(0,0,0,0.18)] flex flex-col">
            <div className="px-5 h-14 border-b border-[var(--admin-border)] flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-[var(--admin-text)]">Choose recipients</p>
                <p className="text-[11px] text-[var(--admin-muted)]">{selectedEmails.length} selected</p>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} className="w-8 h-8 rounded-md bg-[var(--admin-soft)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex items-center justify-center cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--admin-border)] flex flex-col gap-3">
              <div className="flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-soft)] p-0.5">
                {[
                  { id: 'leads' as const, label: 'Leads', icon: UserCheck },
                  { id: 'users' as const, label: 'Users', icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRecipientSource(item.id)}
                      className={`flex-1 h-9 px-3 rounded-md text-[12px] font-medium cursor-pointer inline-flex items-center justify-center gap-2 ${
                        recipientSource === item.id ? 'bg-[var(--admin-sidebar)] text-[var(--admin-text)] shadow-sm' : 'text-[var(--admin-muted)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--admin-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={recipientSearch}
                  onChange={(event) => setRecipientSearch(event.target.value)}
                  placeholder={`Search ${recipientSource}...`}
                  className="w-full pl-10 pr-3"
                  aria-label="Search recipients"
                />
              </div>
              <button type="button" onClick={toggleAllVisible} disabled={recipients.length === 0} className="admin-btn w-fit">
                <Check className="w-3.5 h-3.5" />
                {allVisibleSelected ? 'Clear visible' : 'Select all visible'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--admin-border)]">
              {recipientError && <p className="p-4 text-[13px] text-red-700">{recipientError}</p>}
              {recipientsLoading && (
                <div className="p-4 flex flex-col gap-2">
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </div>
              )}
              {!recipientsLoading && !recipientError && recipients.length === 0 && (
                <p className="p-10 text-center text-[13px] text-[var(--admin-muted)]">No recipients found.</p>
              )}
              {!recipientsLoading && recipients.map((row) => {
                const selected = selectedRecipients.some((item) => recipientKey(item) === recipientKey(row));
                return (
                  <button
                    key={recipientKey(row)}
                    type="button"
                    onClick={() => toggleRecipient(row)}
                    className={`w-full px-4 py-3 text-left flex items-start gap-3 cursor-pointer ${
                      selected ? 'bg-[var(--admin-active)]' : 'hover:bg-[var(--admin-hover)]'
                    }`}
                  >
                    <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      selected ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white' : 'border-[var(--admin-border)]'
                    }`}>
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-[var(--admin-text)] truncate">{row.name || row.email}</span>
                      <span className="block text-[12px] text-[var(--admin-muted)] truncate">{row.email}</span>
                      {row.meta && <span className="block text-[11px] text-[var(--admin-muted)] truncate mt-0.5">{row.meta}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-[var(--admin-border)] flex items-center justify-between gap-3">
              <button type="button" onClick={() => setSelectedRecipients([])} disabled={selectedRecipients.length === 0} className="admin-btn">
                Clear
              </button>
              <button type="button" onClick={() => setPickerOpen(false)} className="admin-btn-primary">
                Use {selectedEmails.length || 0} recipient{selectedEmails.length === 1 ? '' : 's'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
