import React, { useEffect, useState } from 'react';
import { RecordListEditor, FieldConfig } from './RecordListEditor';
import { adminFetch } from '../../../utils/adminAuth';
import { X, Calendar, Radio, Users, Target, Trash2, Mail, Phone, Clock } from 'lucide-react';

const PERSON_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    options: ['founder', 'co-founder', 'leadership'],
  },
  { key: 'title', label: 'Designation', type: 'text', placeholder: 'e.g. Founder, CareerBuddies' },
  { key: 'photoUrl', label: 'Photo', type: 'image' },
  { key: 'yearsOfExperience', label: 'Experience Badge', type: 'text', placeholder: 'e.g. 10+ Years of Professional Experience' },
  { key: 'shortBio', label: 'Short Bio (cards)', type: 'textarea' },
  { key: 'longBio', label: 'Long Bio (profile)', type: 'textarea' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'linkedIn', label: 'LinkedIn URL', type: 'text' },
  { key: 'expertise', label: 'Expertise', type: 'tags', placeholder: 'Career Development, Business Strategy' },
  { key: 'careerHighlights', label: 'Career Highlights', type: 'tags', placeholder: 'Mentored 400+ professionals, Built diagnostic framework' },
];

const PERSON_EMPTY = {
  name: '',
  role: 'leadership',
  title: '',
  photoUrl: '',
  yearsOfExperience: '',
  shortBio: '',
  longBio: '',
  email: '',
  linkedIn: '',
  expertise: [],
  careerHighlights: [],
};

const MENTOR_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  {
    key: 'email',
    label: 'Mentor Email (creates portal account & sends invite)',
    type: 'text',
    placeholder: 'mentor@example.com',
  },
  { key: 'designation', label: 'Designation / Title', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'companyColor', label: 'Company Brand Colour (hex)', type: 'text', placeholder: '#4285F4' },
  {
    key: 'category',
    label: 'Category (drives the public filter)',
    type: 'select',
    options: ['Engineering', 'Product', 'Design', 'Data & AI', 'Marketing & Growth', 'Leadership'],
  },
  { key: 'photoUrl', label: 'Mentor Photo', type: 'image' },
  { key: 'experienceYears', label: 'Experience (years)', type: 'number' },
  { key: 'bio', label: 'Short Bio (shown on cards)', type: 'textarea' },
  { key: 'longBio', label: 'Full Bio (shown in profile)', type: 'textarea' },
  { key: 'expertise', label: 'Expertise / Skills', type: 'tags', placeholder: 'Go, Distributed Systems, Kubernetes' },
  { key: 'topics', label: 'Session Topics', type: 'tags', placeholder: 'System Design, Mock Interviews' },
  { key: 'pastCompanies', label: 'Past Companies', type: 'tags', placeholder: 'Lyft, Amazon' },
  { key: 'linkedIn', label: 'LinkedIn / Profile URL', type: 'text' },
  { key: 'rating', label: 'Rating (0-5)', type: 'number' },
  { key: 'reviewCount', label: 'Number of Reviews', type: 'number' },
  { key: 'sessionsCompleted', label: 'Sessions Completed', type: 'number' },
  { key: 'hourlyRate', label: 'Price per Session (INR)', type: 'number' },
  { key: 'availableNext', label: 'Next Available (text)', type: 'text', placeholder: 'Tomorrow, 2:00 PM' },
  {
    key: 'reviews',
    label: 'Reviews',
    type: 'json',
    placeholder: '[{"id":"r1","author":"","role":"","rating":5,"date":"","comment":""}]',
  },
  { key: 'verified', label: 'Verified mentor badge', type: 'checkbox' },
  { key: 'featured', label: 'Featured', type: 'checkbox' },
  { key: 'superMentor', label: 'Super Mentor', type: 'checkbox' },
];

const MENTOR_EMPTY = {
  name: '',
  email: '',
  designation: '',
  company: '',
  companyColor: '',
  category: 'Engineering',
  photoUrl: '',
  experienceYears: 0,
  bio: '',
  longBio: '',
  expertise: [],
  topics: [],
  pastCompanies: [],
  linkedIn: '',
  rating: 5,
  reviewCount: 0,
  sessionsCompleted: 0,
  hourlyRate: 0,
  availableNext: '',
  reviews: [],
  verified: true,
  featured: false,
  superMentor: false,
};

// ─── Status style map ─────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  upcoming:     { bg: '#eff6ff', text: '#1d4ed8', label: 'Upcoming' },
  filling_fast: { bg: '#fff7ed', text: '#c2410c', label: 'Filling Fast' },
  housefull:    { bg: '#fef2f2', text: '#b91c1c', label: 'Housefull' },
  completed:    { bg: '#f0fdf4', text: '#15803d', label: 'Completed' },
};

// ─── Lead / Booking Status styles ─────────────────────────────────────────────
const LEAD_STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  new:       { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'New Request' },
  contacted: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', label: 'Contacted' },
  scheduled: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe', label: 'Scheduled' },
  converted: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'Confirmed / Done' },
  cancelled: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Cancelled' },
};

function parseBookingDetails(lead: Record<string, any>) {
  let date = lead.bookingDate || '';
  let slot = lead.bookingSlot || '';
  let topic = lead.bookingTopic || '';
  let candidateNote = '';

  const noteText = lead.notes?.[0]?.text || '';
  if (noteText.includes('Mentor Session:')) {
    const slotMatch = noteText.match(/Slot:\s*([^|]+)/);
    if (slotMatch && (!slot || !date)) {
      const parts = slotMatch[1].trim().split(',');
      if (parts.length > 1) {
        if (!date) date = parts[0].trim();
        if (!slot) slot = parts.slice(1).join(',').trim();
      } else if (!slot) {
        slot = slotMatch[1].trim();
      }
    }
    const topicMatch = noteText.match(/Topic:\s*([^|]+)/);
    if (topicMatch && !topic) {
      topic = topicMatch[1].trim();
    }
    const userNoteMatch = noteText.match(/Notes:\s*(.+)$/);
    if (userNoteMatch && userNoteMatch[1].trim() !== 'None') {
      candidateNote = userNoteMatch[1].trim();
    }
  }

  return {
    date: date || 'Flexible date',
    slot: slot || 'Timing requested',
    topic: topic || lead.requirement || '1:1 Career Strategy & Mentorship',
    candidateNote,
  };
}

function getMentorBookings(mentor: Record<string, any>, leads: Record<string, any>[]) {
  return leads.filter((l) => {
    if (l.mentorId && (String(l.mentorId) === String(mentor._id) || String(l.mentorId) === String(mentor.id))) {
      return true;
    }
    const mName = (mentor.name || '').trim().toLowerCase();
    if (!mName) return false;

    const isBooking =
      l.source?.toLowerCase().includes('booking') ||
      l.requirement?.toLowerCase().includes('1:1') ||
      l.planInterest?.toLowerCase().includes('mentor booking');

    if (isBooking) {
      if (l.mentorName && l.mentorName.toLowerCase().includes(mName)) return true;
      if (l.planInterest && l.planInterest.toLowerCase().includes(mName)) return true;
      if (l.requirement && l.requirement.toLowerCase().includes(mName)) return true;
      if (l.notes && Array.isArray(l.notes) && l.notes.some((n: any) => n.text?.toLowerCase().includes(mName))) return true;
    }
    return false;
  });
}

// ─── Mentor Detail Drawer ─────────────────────────────────────────────────────
interface MentorDrawerProps {
  mentor: Record<string, any>;
  webinars: Record<string, any>[];
  leads: Record<string, any>[];
  onClose: () => void;
  onInvite: (mentor: Record<string, any>) => Promise<void>;
  inviting: boolean;
  onUpdateLeadStatus?: (leadId: string, status: string) => Promise<void>;
  onDeleteBooking?: (leadId: string) => Promise<void>;
}

const MentorDrawer: React.FC<MentorDrawerProps> = ({
  mentor,
  webinars,
  leads,
  onClose,
  onInvite,
  inviting,
  onUpdateLeadStatus,
  onDeleteBooking,
}) => {
  const linked = webinars.filter(
    (w) => w.mentorId && String(w.mentorId) === String(mentor._id)
  );
  const activeWebinars = linked.filter((w) => w.status === 'upcoming' || w.status === 'filling_fast');
  const totalReg = linked.reduce((s, w) => s + (w.registeredCount || 0), 0);
  const mentorBookings = getMentorBookings(mentor, leads);

  const portalState = mentor.portalStatus?.state;
  const isActive  = portalState === 'active';
  const isPending = portalState === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        aria-label="Close mentor details"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="relative z-10 w-full max-w-lg h-full bg-[var(--admin-sidebar)] shadow-[0_16px_60px_rgba(0,0,0,0.18)] border-l border-[var(--admin-border)] flex flex-col text-[var(--admin-text)] overflow-hidden">
        {/* ── Header ── */}
        <div className="p-5 border-b border-[var(--admin-border)] bg-[var(--admin-sidebar)] shrink-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-accent)]">
              Mentor Details
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--admin-soft)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile row */}
          <div className="flex items-center gap-3.5 mb-4">
            {mentor.photoUrl ? (
              <img
                src={mentor.photoUrl}
                alt={mentor.name}
                className="w-14 h-14 rounded-full object-cover border border-[var(--admin-border)] shadow-xs shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[var(--admin-active)] text-[var(--admin-accent)] flex items-center justify-center text-lg font-bold shrink-0 border border-[var(--admin-border)]">
                {mentor.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold text-[var(--admin-text)] leading-tight truncate">
                {mentor.name}
              </h2>
              {mentor.designation && (
                <p className="text-[12px] text-[var(--admin-muted)] mt-0.5 truncate">
                  {mentor.designation}
                </p>
              )}
              {mentor.company && (
                <p className="text-[11px] text-[var(--admin-muted)] mt-0.5 truncate font-medium">
                  {mentor.company}
                </p>
              )}
            </div>
          </div>

          {/* Stats row (4 cards) */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Webinars',      value: linked.length, icon: Calendar },
              { label: 'Active Now',    value: activeWebinars.length, icon: Radio },
              { label: 'Registrations', value: totalReg, icon: Users },
              { label: '1:1 Bookings',  value: mentorBookings.length, icon: Target },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="p-2.5 rounded-xl bg-[var(--admin-soft)] border border-[var(--admin-border)] text-center flex flex-col items-center justify-center"
                >
                  <Icon className="w-3.5 h-3.5 text-[var(--admin-muted)] mb-1" />
                  <div className="text-[16px] font-bold text-[var(--admin-text)] leading-tight">
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-medium text-[var(--admin-muted)] mt-0.5 leading-tight truncate w-full">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* 1:1 Personal Session Bookings Card */}
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-4 flex flex-col gap-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                1:1 Personal Session Bookings
              </span>
              {mentorBookings.length > 0 && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--admin-active)] text-[var(--admin-accent)] border border-[var(--admin-border)]">
                  {mentorBookings.length} booked
                </span>
              )}
            </div>

            {mentorBookings.length === 0 ? (
              <div className="text-center py-6 px-4 border border-dashed border-[var(--admin-border)] rounded-xl text-[var(--admin-muted)] text-[12px] flex flex-col items-center">
                <Target className="w-6 h-6 text-[var(--admin-muted)] mb-2 opacity-60" />
                <p className="font-semibold text-[var(--admin-text)] text-[13px] mb-1">No 1:1 Bookings Yet</p>
                <p className="text-[11px] text-[var(--admin-muted)] max-w-xs">
                  When candidates book personal sessions with this mentor, their preferred timings and details will appear here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {mentorBookings.map((b) => {
                  const details = parseBookingDetails(b);
                  return (
                    <div
                      key={b.id || b._id}
                      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)]/50 p-3.5 flex flex-col gap-2.5"
                    >
                      {/* Candidate header + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-semibold text-[var(--admin-text)] leading-tight truncate">
                            {b.fullName || `${b.firstName || ''} ${b.lastName || ''}`.trim() || 'Candidate'}
                          </h4>
                          {(b.currentRole || b.experience) && (
                            <p className="text-[11px] text-[var(--admin-muted)] mt-0.5 truncate">
                              {[b.currentRole, b.experience].filter((x) => x && x !== 'Not specified' && x !== 'Professional').join(' · ')}
                            </p>
                          )}
                        </div>

                        {/* Status selector & Delete button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onUpdateLeadStatus ? (
                            <select
                              value={b.status || 'new'}
                              onChange={(e) => onUpdateLeadStatus(b.id || b._id, e.target.value)}
                              className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[var(--admin-text)] cursor-pointer focus:outline-none focus:border-[var(--admin-accent)]"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="converted">Confirmed / Done</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--admin-active)] text-[var(--admin-accent)]">
                              {b.status || 'New'}
                            </span>
                          )}

                          {onDeleteBooking && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to permanently delete this booking for ${b.fullName || b.firstName || 'candidate'}?`)) {
                                  onDeleteBooking(b.id || b._id);
                                }
                              }}
                              className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete booking record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Preferred Schedule / Timing pill */}
                      <div className="rounded-lg bg-[var(--admin-sidebar)] border border-[var(--admin-border)] p-2.5 flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center gap-2 text-[var(--admin-text)] font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[var(--admin-muted)]" />
                            {details.date}
                          </span>
                          <span className="text-[var(--admin-muted)]">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[var(--admin-muted)]" />
                            {details.slot}
                          </span>
                        </div>
                        {details.topic && (
                          <div className="text-[var(--admin-muted)]">
                            <strong className="text-[var(--admin-text)] font-semibold">Topic:</strong> {details.topic}
                          </div>
                        )}
                        {details.candidateNote && (
                          <div className="text-[var(--admin-muted)] italic">
                            "{details.candidateNote}"
                          </div>
                        )}
                      </div>

                      {/* Contact row */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--admin-border)]/60 text-[11px]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {b.mobile && (
                            <a
                              href={`tel:${b.mobile}`}
                              className="text-[var(--admin-accent)] font-medium hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {b.mobile}
                            </a>
                          )}
                          {b.mobile && (
                            <a
                              href={`https://wa.me/${String(b.mobile).replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15"
                            >
                              WhatsApp
                            </a>
                          )}
                          {b.email && (
                            <a
                              href={`mailto:${b.email}`}
                              className="text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex items-center gap-1 truncate max-w-[170px]"
                            >
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{b.email}</span>
                            </a>
                          )}
                        </div>

                        {b.createdAt && (
                          <span className="text-[10px] text-[var(--admin-muted)] ml-auto">
                            {new Date(b.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Portal Account card */}
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-4 flex flex-col gap-3 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
              Portal Account
            </span>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className={`text-[13px] ${mentor.email ? 'font-medium text-[var(--admin-text)]' : 'italic text-[var(--admin-muted)]'}`}>
                  {mentor.email || 'No email set'}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {isActive && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      ✓ Portal Active
                    </span>
                  )}
                  {isPending && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      ⏳ Invite Pending
                    </span>
                  )}
                  {!isActive && !isPending && mentor.email && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--admin-soft)] text-[var(--admin-muted)] border border-[var(--admin-border)]">
                      No Portal Login
                    </span>
                  )}
                  {!mentor.email && (
                    <span className="text-[11px] text-[var(--admin-muted)] italic">No portal account</span>
                  )}
                </div>
              </div>
              {mentor.email && !isActive && (
                <button
                  type="button"
                  onClick={() => onInvite(mentor)}
                  disabled={inviting}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--admin-accent)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  {inviting ? 'Sending…' : isPending ? 'Resend Invite' : 'Send Invite'}
                </button>
              )}
            </div>
          </div>

          {/* Linked Webinars */}
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-4 flex flex-col gap-3 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
              Linked Webinars
            </span>

            {linked.length === 0 ? (
              <div className="text-center py-6 px-4 border border-dashed border-[var(--admin-border)] rounded-xl text-[var(--admin-muted)] text-[12px] flex flex-col items-center">
                <Calendar className="w-6 h-6 text-[var(--admin-muted)] mb-2 opacity-60" />
                <p className="font-semibold text-[var(--admin-text)] text-[13px] mb-1">No Webinars Linked Yet</p>
                <p className="text-[11px] text-[var(--admin-muted)]">
                  Go to <strong>Manage Webinars</strong> to link this mentor.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {linked.map((w) => {
                  const s = STATUS_STYLES[w.status] || STATUS_STYLES.upcoming;
                  return (
                    <div
                      key={w._id}
                      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)]/50 p-3 flex items-start justify-between gap-3"
                    >
                      {/* Webinar info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13px] font-semibold text-[var(--admin-text)] leading-tight truncate">
                          {w.title || 'Untitled Webinar'}
                        </h4>
                        {(w.date || w.time) && (
                          <p className="text-[11px] text-[var(--admin-muted)] mt-1 truncate">
                            {[w.date, w.time].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: s.bg, color: s.text }}
                          >
                            {s.label}
                          </span>
                          {w.priceINR != null && w.priceINR > 0 && (
                            <span className="text-[11px] font-medium text-[var(--admin-muted)]">₹{w.priceINR}</span>
                          )}
                        </div>
                      </div>

                      {/* Registration count */}
                      <div className="px-3 py-1.5 rounded-lg bg-[var(--admin-sidebar)] border border-[var(--admin-border)] text-center min-w-[54px] shrink-0">
                        <div className="text-[15px] font-bold text-[var(--admin-text)] leading-tight">
                          {w.registeredCount || 0}
                        </div>
                        <div className="text-[9px] text-[var(--admin-muted)] mt-0.5 font-medium">
                          {w.capacity ? `/ ${w.capacity}` : 'applied'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bio */}
          {mentor.bio && (
            <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-4 flex flex-col gap-2 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
                Bio
              </span>
              <p className="text-[12px] text-[var(--admin-muted)] leading-relaxed">
                {mentor.bio}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

// ─── Mentors Tab ──────────────────────────────────────────────────────────────

const MentorsTab: React.FC = () => {
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [webinars, setWebinars] = useState<Record<string, any>[]>([]);
  const [leads, setLeads] = useState<Record<string, any>[]>([]);
  const [drawerMentor, setDrawerMentor] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    adminFetch('/api/webinars/admin')
      .then((r) => r.json())
      .then((d) => { if (d.success) setWebinars(d.items || []); })
      .catch(() => {});

    adminFetch('/api/leads')
      .then((r) => r.json())
      .then((d) => { if (d.success) setLeads(d.leads || []); })
      .catch(() => {});
  }, []);

  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      const res = await adminFetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => (l.id === leadId || l._id === leadId) ? { ...l, status } : l));
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const handleDeleteBooking = async (leadId: string) => {
    try {
      const res = await adminFetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId && l._id !== leadId));
      } else {
        alert(data.error || 'Failed to delete booking.');
      }
    } catch {
      alert('Network error while deleting booking.');
    }
  };

  const handleInvite = async (item: Record<string, any>, refresh?: () => void) => {
    if (!item.email) {
      alert('Please edit this mentor and enter their email address first.');
      return;
    }
    setInvitingId(item._id);
    setNotice(null);
    try {
      const res = await adminFetch('/api/admin/mentor-accounts/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name, email: item.email }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.emailSent) {
          setNotice({ text: `Invite email sent to ${item.email}! (Valid for 48 hours)` });
        } else if (data.link) {
          prompt('Account created, but SMTP failed to send email. Share this link with the mentor:', data.link);
          setNotice({ text: `Portal invite created for ${item.email}.` });
        } else {
          setNotice({ text: data.message || `Portal invite processed for ${item.email}.` });
        }
        refresh?.();
      } else {
        setNotice({ text: data.error || 'Failed to send invite.', error: true });
      }
    } catch {
      setNotice({ text: 'Network error. Please try again.', error: true });
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {notice && (
        <div className={`p-3 rounded-2xl text-xs font-medium flex items-center justify-between border ${
          notice.error ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold ml-2 text-sm hover:opacity-75 cursor-pointer">×</button>
        </div>
      )}

      <RecordListEditor
        apiBase="/api/mentors"
        labelSingular="Mentor"
        fields={MENTOR_FIELDS}
        emptyRecord={MENTOR_EMPTY}
        titleField="name"
        subtitleField="designation"
        imageField="photoUrl"
        renderItemExtra={(item, refresh) => {
          const linked   = webinars.filter((w) => w.mentorId && String(w.mentorId) === String(item._id));
          const totalReg = linked.reduce((s, w) => s + (w.registeredCount || 0), 0);
          const mentorBookings = getMentorBookings(item, leads);
          const isActivated = item.portalStatus?.state === 'active';
          const isPending   = item.portalStatus?.state === 'pending';
          const isUninvited = item.portalStatus?.state === 'uninvited';
          const isBusy = invitingId === item._id;

          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {linked.length > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  📅 {linked.length} webinar{linked.length !== 1 ? 's' : ''} · {totalReg} reg.
                </span>
              )}
              {mentorBookings.length > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  🎯 {mentorBookings.length} 1:1 booking{mentorBookings.length !== 1 ? 's' : ''}
                </span>
              )}
              {item.email && isActivated && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Portal Active
                </span>
              )}
              {item.email && isPending && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  Invite Pending
                </span>
              )}
              {item.email && isUninvited && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                  No Portal Login
                </span>
              )}
              {!item.email && (
                <span className="text-[11px] text-[#8c909c] italic px-1">No email</span>
              )}
              {item.email && (!isActivated || isPending || isUninvited) && (
                <button
                  type="button"
                  onClick={() => handleInvite(item, refresh)}
                  disabled={isBusy}
                  className="text-[11px] font-semibold text-[#002869] hover:underline px-1.5 py-0.5 rounded hover:bg-[#eef4ff] cursor-pointer disabled:opacity-50"
                >
                  {isBusy ? 'Sending...' : isPending ? 'Resend Invite' : 'Send Invite'}
                </button>
              )}
              {/* ── View Details → Drawer ── */}
              <button
                type="button"
                onClick={() => setDrawerMentor(item)}
                className="text-[11px] font-semibold text-white bg-[#002869] hover:bg-[#1a47a8] px-2.5 py-0.5 rounded-md cursor-pointer transition-colors"
              >
                View Details
              </button>
            </div>
          );
        }}
      />

      {drawerMentor && (
        <MentorDrawer
          mentor={drawerMentor}
          webinars={webinars}
          leads={leads}
          onClose={() => setDrawerMentor(null)}
          onInvite={(m) => handleInvite(m)}
          inviting={invitingId === drawerMentor._id}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onDeleteBooking={handleDeleteBooking}
        />
      )}
    </div>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const SUB_TABS = ['Founder & Co-Founder', 'Leadership', 'Mentors'] as const;
type SubTab = (typeof SUB_TABS)[number];

export const PeopleMentorsPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('Founder & Co-Founder');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-[#061b3b]">People & Mentors</h2>
        <p className="text-xs text-[#666a76]">
          Manage Founder/Co-Founder profiles, Leadership entries, and Mentors. Mentors with an email automatically get a portal invite.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              subTab === tab
                ? 'bg-[#002869] text-white'
                : 'bg-white text-[#434652] hover:bg-[#e0e8ff] border border-[#cbdaff]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === 'Founder & Co-Founder' && (
        <RecordListEditor
          apiBase="/api/people"
          labelSingular="Person"
          fields={PERSON_FIELDS.map((f) =>
            f.key === 'role' ? { ...f, options: ['founder', 'co-founder'] } : f
          )}
          emptyRecord={{ ...PERSON_EMPTY, role: 'founder' }}
          filter={{ role: ['founder', 'co-founder'] }}
          titleField="name"
          subtitleField="title"
          imageField="photoUrl"
        />
      )}

      {subTab === 'Leadership' && (
        <>
          <p className="text-[11px] text-[#666a76] -mt-2">
            Extra leadership profiles shown on Home and the Leadership tab.
          </p>
          <RecordListEditor
            apiBase="/api/people"
            labelSingular="Leader"
            fields={PERSON_FIELDS.filter((f) => f.key !== 'role')}
            emptyRecord={PERSON_EMPTY}
            filter={{ role: 'leadership' }}
            titleField="name"
            subtitleField="title"
            imageField="photoUrl"
          />
        </>
      )}

      {subTab === 'Mentors' && <MentorsTab />}
    </div>
  );
};

export default PeopleMentorsPanel;
