import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, WebinarItem, SiteConfig } from '../../types';
import { DEFAULT_SITE_CONFIG, INITIAL_WEBINARS } from '../../config/siteConfig';
import {
  ShieldCheck,
  Users,
  FileText,
  Settings,
  Download,
  PhoneCall,
  Search,
  LayoutDashboard,
  CalendarDays,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronsUpDown,
  Mail,
  Globe,
  Code2,
  ScrollText,
  Bell,
  CreditCard,
  UserCircle2,
  GraduationCap,
  UserCheck,
  Sparkles,
  Eye,
  Compass,
  MessageCircle,
} from 'lucide-react';
import {
  adminFetch,
  clearAdminToken,
  getAdminProfile,
  getAdminTheme,
  setAdminTheme,
  getSidebarCollapsed,
  setSidebarCollapsed,
  AdminTheme,
} from '../../utils/adminAuth';
import { useAdminNotifications, AdminNotice } from '../../hooks/useAdminNotifications';

import { SiteSettingsPanel } from './admin/SiteSettingsPanel';
import { PeopleMentorsPanel } from './admin/PeopleMentorsPanel';
import { CandidateContentPanel } from './admin/CandidateContentPanel';
import { CatalogPanel, WEBINAR_FIELDS } from './admin/CatalogPanel';
import { RecordListEditor } from './admin/RecordListEditor';
import { PaymentsPanel } from './admin/PaymentsPanel';
import { UsersPanel } from './admin/UsersPanel';
import { MailPanel } from './admin/MailPanel';
import { SeoPanel } from './admin/SeoPanel';
import { HomeHtmlPanel } from './admin/HomeHtmlPanel';
import { AdminTeamPanel } from './admin/AdminTeamPanel';
import { LogsPanel } from './admin/LogsPanel';
import { NotificationsPanel } from './admin/NotificationsPanel';
import { NotificationsDrawer } from './admin/NotificationsDrawer';

export type AdminTab =
  | 'overview'
  | 'leads'
  | 'webinars'
  | 'catalog'
  | 'people'
  | 'candidates'
  | 'payments'
  | 'users'
  | 'mail'
  | 'seo'
  | 'home-html'
  | 'team'
  | 'logs'
  | 'notifications'
  | 'settings';

interface AdminScreenProps {
  onOpenLeadDetail?: (lead: Lead) => void;
  setActivePage?: (page: any) => void;
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Dashboard Overview',
  leads: 'Leads & Inquiries',
  webinars: 'Manage Webinars',
  catalog: 'Programmes & Catalog',
  people: 'People & Mentors',
  candidates: 'Candidate Content',
  payments: 'Payments & Billing',
  users: 'Users & Candidates',
  mail: 'Email & Mailbox',
  seo: 'SEO & Analytics',
  'home-html': 'Custom HTML Sections',
  team: 'Admin Team',
  logs: 'Activity Logs',
  notifications: 'Notifications',
  settings: 'Site Settings & Pricing',
};

const PAGE_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Dashboard Overview',
    subtitle: 'Live lead stream, active webinars, quick statistics, and recent activity.',
  },
  leads: {
    title: 'Leads & Inquiries',
    subtitle: 'Search, filter, update contact statuses, and export candidate inquiries to CSV.',
  },
  webinars: {
    title: 'Manage Webinars',
    subtitle: 'Add, edit, or adjust pricing and scheduling for live mentor webinars.',
  },
  catalog: {
    title: 'Programmes & Catalog',
    subtitle: 'Manage curated courses, success stories, services, plans, and resources.',
  },
  people: {
    title: 'People & Mentors',
    subtitle: 'Manage verified mentors, industry advisors, and leadership profiles.',
  },
  candidates: {
    title: 'Candidate Content',
    subtitle: 'Manage materials, sessions, notifications, and invoices inside the Candidate Area.',
  },
  payments: {
    title: 'Payments & Billing',
    subtitle: 'Monitor orders, verify transactions, download financial reports, and inspect gateway logs.',
  },
  users: {
    title: 'Users & Candidate Accounts',
    subtitle: 'Inspect registered accounts, social logins, linked payments, and submitted enquiries.',
  },
  mail: {
    title: 'Email & Outbox',
    subtitle: 'Review sent advisories, check inbox responses, and send follow-ups using standard templates.',
  },
  seo: {
    title: 'SEO & Traffic Analytics',
    subtitle: 'Page traffic metrics, referral sources, and search engine meta configuration.',
  },
  'home-html': {
    title: 'Landing Page HTML Blocks',
    subtitle: 'Customize editable section content and raw HTML blocks on the homepage.',
  },
  team: {
    title: 'Admin Team Access',
    subtitle: 'Manage sub-admin credentials, team roles, and reset passwords.',
  },
  logs: {
    title: 'Activity & Audit Trail',
    subtitle: 'Track all administrative changes, logins, catalog updates, and status adjustments.',
  },
  notifications: {
    title: 'Notification Center',
    subtitle: 'Real-time alert stream for enquiries, new candidates, and incoming payments.',
  },
  settings: {
    title: 'Site Settings & Pricing',
    subtitle: 'Brand assets, navigation visibility, section toggles, and global pricing overrides.',
  },
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ setActivePage }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [webinars, setWebinars] = useState<WebinarItem[]>(INITIAL_WEBINARS);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLead, setSearchLead] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadTypeFilter, setLeadTypeFilter] = useState<'all' | 'checkin' | 'counselling'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Notifications
  const { items: notifItems, unread, unreadCount, markAllRead } = useAdminNotifications();
  const unreadIds = useMemo(() => new Set(unread.map((u) => u.id)), [unread]);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // Shell state — mirrors MentorDashboardScreen
  const [theme, setTheme] = useState<AdminTheme>(getAdminTheme);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(getSidebarCollapsed);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [menuOpen, setMenuOpen] = useState(false); // header account dropdown
  const [accountOpen, setAccountOpen] = useState(false); // sidebar account popup
  const menuRef = useRef<HTMLDivElement>(null);
  const profile = getAdminProfile();

  useEffect(() => {
    setAdminTheme(theme);
  }, [theme]);

  useEffect(() => {
    setSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  // Close header dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  // Close sidebar account popup on outside click
  useEffect(() => {
    if (!accountOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-admin-account]')) setAccountOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [accountOpen]);

  useEffect(() => {
    fetchLeads();
    fetchWebinars();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await adminFetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        if (data.leads) setLeads(data.leads);
      }
    } catch (err) {
      console.warn('Could not fetch from server, using existing state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWebinars = async () => {
    try {
      const res = await adminFetch('/api/webinars/admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setWebinars(data.items);
        }
      }
    } catch (err) {
      console.warn('Could not fetch webinars from server:', err);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: 'new' | 'contacted' | 'scheduled' | 'converted') => {
    try {
      await adminFetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const exportLeadsCSV = () => {
    if (leads.length === 0) return;
    const headers = ['S.No', 'Date (IST)', 'Name', 'Mobile', 'Email', 'Role', 'Experience', 'Requirement', 'Status', 'Source'];
    const rows = leads.map((l) => [
      l.serialNumber,
      `"${l.timestampIST || ''}"`,
      `"${l.fullName}"`,
      `"${l.mobile}"`,
      `"${l.email}"`,
      `"${l.currentRole || ''}"`,
      `"${l.experience || ''}"`,
      `"${(l.requirement || '').replace(/"/g, '""')}"`,
      l.status,
      l.source,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `careerbuddies-leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignOut = () => {
    clearAdminToken();
    window.location.reload();
  };

  const goTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    setMenuOpen(false);
    setAccountOpen(false);
    window.scrollTo({ top: 0 });
  };

  const isCheckInLead = (l: Lead) =>
    Boolean(
      (l.source && l.source.toLowerCase().includes('check-in')) ||
      (l.requirement && l.requirement.toLowerCase().includes('career check-in')) ||
      (l.notes && l.notes.some((n) => n.text?.toLowerCase().includes('career check-in')))
    );

  const checkInLeadsCount = useMemo(() => leads.filter(isCheckInLead).length, [leads]);
  const otherLeadsCount = useMemo(() => leads.filter((l) => !isCheckInLead(l)).length, [leads]);

  const filteredLeads = leads.filter((l) => {
    const matchStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter;
    const isCheckIn = isCheckInLead(l);
    const matchType =
      leadTypeFilter === 'all' ||
      (leadTypeFilter === 'checkin' && isCheckIn) ||
      (leadTypeFilter === 'counselling' && !isCheckIn);

    const q = searchLead.toLowerCase();
    const matchQ =
      !q ||
      l.fullName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.mobile.includes(q) ||
      (l.requirement && l.requirement.toLowerCase().includes(q)) ||
      (l.currentRole && l.currentRole.toLowerCase().includes(q)) ||
      (l.experience && l.experience.toLowerCase().includes(q));
    return matchStatus && matchType && matchQ;
  });

  // ─── Nav groups ────────────────────────────────────────────────────────────
  const navGroups: {
    heading?: string;
    items: {
      id: AdminTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
    }[];
  }[] = [
    {
      heading: 'Core Workspace',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'leads', label: 'Leads & Inquiries', icon: CalendarDays, badge: leads.length },
        { id: 'webinars', label: 'Manage Webinars', icon: GraduationCap, badge: webinars.length },
        { id: 'catalog', label: 'Programmes & Catalog', icon: FileText },
        { id: 'people', label: 'People & Mentors', icon: Users },
        { id: 'candidates', label: 'Candidate Content', icon: UserCheck },
        { id: 'payments', label: 'Payments & Billing', icon: CreditCard },
        { id: 'users', label: 'Users & Candidates', icon: UserCircle2 },
      ],
    },
    {
      heading: 'Communications & Reach',
      items: [
        { id: 'mail', label: 'Email & Mailbox', icon: Mail },
        { id: 'seo', label: 'SEO & Analytics', icon: Globe },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
      ],
    },
    {
      heading: 'System & Config',
      items: [
        { id: 'home-html', label: 'Landing Page HTML', icon: Code2 },
        { id: 'team', label: 'Admin Team', icon: ShieldCheck },
        { id: 'logs', label: 'Activity Logs', icon: ScrollText },
        { id: 'settings', label: 'Site Settings', icon: Settings },
      ],
    },
  ];

  const accountActions = [
    {
      label: 'Export CSV',
      icon: Download,
      onClick: exportLeadsCSV,
    },
    {
      label: setActivePage ? 'Back to website' : 'Exit',
      icon: LogOut,
      onClick: () => {
        if (setActivePage) {
          setActivePage('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
    },
    { label: 'Sign out', icon: LogOut, onClick: handleSignOut },
  ];

  // ─── Sidebar renderer ───────────────────────────────────────────────────────
  const renderSidebar = (collapsed: boolean, allowCollapse: boolean) => (
    <aside
      className={`h-full bg-[var(--admin-sidebar)] text-[var(--admin-text)] flex flex-col shrink-0 border-r border-[var(--admin-border)] transition-[width] duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[248px]'
      }`}
    >
      {/* Brand */}
      <div className={`border-b border-[var(--admin-border)] ${collapsed ? 'px-2 py-4' : 'px-4 py-4'}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col gap-3' : 'gap-2.5'}`}>
          <div className="w-8 h-8 rounded-lg bg-[var(--admin-soft)] text-[var(--admin-text)] text-[11px] font-semibold tracking-wide flex items-center justify-center shrink-0">
            CB
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--admin-text)] leading-tight tracking-tight">Career Buddies</p>
              <p className="text-[11px] text-[var(--admin-muted)]">Admin Portal</p>
            </div>
          )}
          {allowCollapse && (
            <button
              type="button"
              onClick={() => setSidebarCollapsedState((c) => !c)}
              className="p-1.5 rounded-md text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Nav groups */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`} aria-label="Admin Portal">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className={gIdx > 0 ? (collapsed ? 'mt-2 pt-2 border-t border-[var(--admin-border)]' : 'mt-4') : ''}>
            {!collapsed && group.heading && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">
                {group.heading}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const on = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTab(item.id)}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={on ? 'page' : undefined}
                    className={`relative w-full flex items-center rounded-md text-[13px] cursor-pointer transition-colors ${
                      collapsed ? 'justify-center h-9' : 'gap-2.5 px-2.5 h-9 text-left'
                    } ${
                      on
                        ? 'bg-[var(--admin-active)] text-[var(--admin-text)]'
                        : 'text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    {on && !collapsed && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--admin-accent)]" />
                    )}
                    <Icon
                      className={`w-[16px] h-[16px] shrink-0 ${
                        on ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-muted)]'
                      }`}
                    />
                    {!collapsed && <span className="flex-1 font-medium truncate">{item.label}</span>}
                    {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`min-w-[20px] px-1.5 py-0.5 rounded text-[10px] font-medium text-center ${
                          item.id === 'notifications'
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-semibold'
                            : 'bg-[var(--admin-soft)] text-[var(--admin-muted)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account footer */}
      <div data-admin-account className={`relative border-t border-[var(--admin-border)] ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
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
          title={profile.name}
          className={`w-full flex items-center rounded-xl bg-[var(--admin-soft)] hover:bg-[var(--admin-hover)] cursor-pointer ${
            collapsed ? 'justify-center h-10' : 'gap-2.5 px-2.5 h-12'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-[var(--admin-page)] text-[var(--admin-text)] text-[11px] font-semibold flex items-center justify-center shrink-0">
            {initials(profile.name)}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[13px] font-medium text-[var(--admin-text)] truncate">{profile.name}</p>
                <p className="text-[11px] text-[var(--admin-muted)] capitalize">{profile.source === 'team' ? 'Team Member' : 'Owner'}</p>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--admin-muted)] shrink-0" />
            </>
          )}
        </button>
      </div>
    </aside>
  );

  // ─── Overview Tab ────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="flex flex-col gap-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Inquiries & Leads', value: leads.length, sub: 'Live Stream', subColor: 'text-[var(--admin-accent)]', onClick: () => goTab('leads') },
          {
            label: 'Scheduled Consultations',
            value: leads.filter((l) => l.status === 'scheduled').length,
            sub: 'In Calendar',
            subColor: 'text-[var(--admin-muted)]',
            onClick: () => goTab('leads'),
          },
          {
            label: 'Active Webinars',
            value: webinars.filter((w: any) => w.visible !== false).length,
            sub: `${webinars.length} total in system`,
            subColor: 'text-[var(--admin-accent)]',
            onClick: () => goTab('webinars'),
          },
          {
            label: 'Unread Notifications',
            value: unreadCount,
            sub: unreadCount > 0 ? 'Requires attention' : 'All caught up',
            subColor: unreadCount > 0 ? 'text-amber-500 font-semibold' : 'text-[var(--admin-muted)]',
            onClick: () => goTab('notifications'),
          },
        ].map(({ label, value, sub, subColor, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-5 flex flex-col gap-2 cursor-pointer hover:border-[var(--admin-accent)] transition-colors"
          >
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">{label}</p>
            <p className="text-[28px] font-semibold text-[var(--admin-text)] leading-none">{value}</p>
            <p className={`text-[12px] ${subColor}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Access Shortcuts */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => goTab('mail')}
          className="px-3.5 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[12px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)] flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Mail className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
          <span>Email & Mailbox</span>
        </button>
        <button
          type="button"
          onClick={() => goTab('payments')}
          className="px-3.5 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[12px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)] flex items-center gap-2 cursor-pointer transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
          <span>Payments & Billing</span>
        </button>
        <button
          type="button"
          onClick={() => goTab('seo')}
          className="px-3.5 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[12px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)] flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
          <span>SEO & Analytics</span>
        </button>
        <button
          type="button"
          onClick={() => goTab('users')}
          className="px-3.5 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[12px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)] flex items-center gap-2 cursor-pointer transition-colors"
        >
          <UserCircle2 className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
          <span>Candidate Accounts</span>
        </button>
        <button
          type="button"
          onClick={() => goTab('settings')}
          className="px-3.5 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] text-[12px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)] flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
          <span>Site Settings</span>
        </button>
      </div>

      {/* Recent activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">Recent Inquiries</h2>
            <button onClick={() => goTab('leads')} className="text-[12px] text-[var(--admin-accent)] hover:underline cursor-pointer">
              View All
            </button>
          </div>
          <div className="flex flex-col divide-y divide-[var(--admin-border)]">
            {leads.slice(0, 5).map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between text-[13px]">
                <div>
                  <strong className="text-[var(--admin-text)] block">{l.fullName}</strong>
                  <span className="text-[12px] text-[var(--admin-muted)]">
                    {l.email} · {l.mobile}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    l.status === 'scheduled' ? 'bg-[var(--admin-soft)] text-[var(--admin-accent)]' : 'bg-[var(--admin-soft)] text-[var(--admin-muted)]'
                  }`}
                >
                  {l.status}
                </span>
              </div>
            ))}
            {leads.length === 0 && (
              <p className="py-6 text-center text-[12px] text-[var(--admin-muted)]">No inquiries received yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">Webinar Management</h2>
              <p className="text-[11px] text-[var(--admin-muted)]">{webinars.length} recorded in system</p>
            </div>
            <button onClick={() => goTab('webinars')} className="text-[12px] text-[var(--admin-accent)] hover:underline cursor-pointer">
              Manage
            </button>
          </div>
          <div className="flex flex-col divide-y divide-[var(--admin-border)]">
            {webinars.slice(0, 5).map((w: any) => {
              const speaker = w.speakerName || w.speaker?.name || 'TBA';
              return (
                <div key={w._id || w.id} className="py-3 flex items-center justify-between text-[13px]">
                  <div className="max-w-[70%]">
                    <strong className="text-[var(--admin-text)] block truncate">{w.title}</strong>
                    <span className="text-[12px] text-[var(--admin-muted)]">
                      {speaker} · {w.date || 'TBD'}
                    </span>
                  </div>
                  <span className="font-semibold text-[var(--admin-accent)]">₹{w.priceINR ?? 0}</span>
                </div>
              );
            })}
            {webinars.length === 0 && (
              <p className="py-6 text-center text-[12px] text-[var(--admin-muted)]">No webinars in catalog yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Diagnostic Helper & Lead Detail Modal ────────────────────────────────
  const parseDiagnosticDetails = (l: Lead) => {
    const notesText = (l.notes || []).map((n) => n.text).join('\n');
    const stageMatch = notesText.match(/Stage:\s*([^\n•]+)/i);
    const directionMatch = notesText.match(/Direction:\s*([^\n•]+)/i);
    const challengeMatch = notesText.match(/(?:Challenge|Bottleneck):\s*([^\n•]+)/i);
    const supportMatch = notesText.match(/(?:Support|Guidance):\s*([^\n•]+)/i);
    const roleMatch = notesText.match(/(?:Role|Target):\s*([^\n•]+)/i);

    return {
      stage: stageMatch ? stageMatch[1].trim() : l.experience || 'Not specified',
      direction: directionMatch ? directionMatch[1].trim() : '',
      challenge: challengeMatch ? challengeMatch[1].trim() : l.requirement?.replace(/^Career Check-in Diagnostic:\s*/, '').trim() || '',
      support: supportMatch ? supportMatch[1].trim() : l.planInterest || '',
      role: roleMatch ? roleMatch[1].trim() : l.currentRole || '',
      rawNotes: notesText,
    };
  };

  // ─── Leads Tab ───────────────────────────────────────────────────────────
  const renderLeads = () => (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] p-5 sm:p-6 flex flex-col gap-5">
      {/* Lead Type Segmented Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLeadTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              leadTypeFilter === 'all'
                ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                : 'bg-[var(--admin-page)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]'
            }`}
          >
            All Inquiries ({leads.length})
          </button>
          <button
            type="button"
            onClick={() => setLeadTypeFilter('checkin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              leadTypeFilter === 'checkin'
                ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                : 'bg-[var(--admin-page)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]'
            }`}
          >
            Career Check-in ({checkInLeadsCount})
          </button>
          <button
            type="button"
            onClick={() => setLeadTypeFilter('counselling')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              leadTypeFilter === 'counselling'
                ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                : 'bg-[var(--admin-page)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]'
            }`}
          >
            Direct Counselling & Others ({otherLeadsCount})
          </button>
        </div>

        <button type="button" onClick={exportLeadsCSV} className="admin-btn">
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search and Status Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--admin-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            aria-label="Search leads"
            type="text"
            placeholder="Search by name, email, role, or phone..."
            value={searchLead}
            onChange={(e) => setSearchLead(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-page)] text-[13px] text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter leads by status"
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-page)] text-[13px] text-[var(--admin-text)] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="scheduled">Scheduled</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[var(--admin-soft)] text-[var(--admin-muted)] uppercase text-[10px] tracking-wider border-b border-[var(--admin-border)]">
            <tr>
              <th className="p-3.5">Candidate</th>
              <th className="p-3.5">Contact</th>
              <th className="p-3.5">Profile & Selected Intent</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border)] text-[var(--admin-text)]">
            {filteredLeads.map((l) => {
              const isCheckIn = isCheckInLead(l);
              const diagnostic = isCheckIn ? parseDiagnosticDetails(l) : null;

              return (
                <tr key={l.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="font-semibold text-[13px] text-[var(--admin-text)]">{l.fullName}</div>
                    {isCheckIn ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--admin-soft)] text-[var(--admin-text)] text-[11px] font-medium border border-[var(--admin-border)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] shrink-0" />
                          Career Check-in
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--admin-muted)] mt-0.5">
                        Source: {l.source || 'Website'}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="text-[12px]">{l.email || 'No email'}</div>
                    <div className="text-[12px] text-[var(--admin-muted)] flex items-center gap-1 mt-0.5">
                      <PhoneCall className="w-3 h-3" /> {l.mobile}
                    </div>
                  </td>
                  <td className="p-3.5 max-w-sm">
                    {isCheckIn && diagnostic ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {diagnostic.stage && (
                            <span className="px-2 py-0.5 rounded-md bg-[var(--admin-soft)] text-[var(--admin-muted)] border border-[var(--admin-border)] text-[11px] font-medium">
                              <strong className="text-[var(--admin-text)] font-semibold">Stage:</strong> {diagnostic.stage}
                            </span>
                          )}
                          {diagnostic.direction && (
                            <span className="px-2 py-0.5 rounded-md bg-[var(--admin-soft)] text-[var(--admin-muted)] border border-[var(--admin-border)] text-[11px] font-medium">
                              <strong className="text-[var(--admin-text)] font-semibold">Direction:</strong> {diagnostic.direction}
                            </span>
                          )}
                        </div>
                        {diagnostic.challenge && (
                          <div className="text-[12px] text-[var(--admin-text)] leading-snug">
                            <span className="text-[var(--admin-muted)] font-medium">Goal: </span>
                            {diagnostic.challenge}
                          </div>
                        )}
                        {diagnostic.support && (
                          <div className="text-[11px] text-[var(--admin-muted)]">
                            <span className="font-semibold text-[var(--admin-text)]">Prefers:</span> {diagnostic.support}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-[var(--admin-text)] truncate">{l.currentRole || 'Not specified'}</div>
                        <div className="text-[11px] text-[var(--admin-muted)] line-clamp-2">{l.requirement || 'No note'}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        l.status === 'scheduled'
                          ? 'bg-[#79fd8d]/25 text-[#00531d] dark:text-[#79fd8d]'
                          : l.status === 'converted'
                          ? 'bg-[#dae2ff]/50 text-[#002869] dark:text-[#a0c4ff]'
                          : 'bg-[var(--admin-soft)] text-[var(--admin-muted)]'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedLead(l)}
                        title="View Full Information"
                        className="px-2.5 py-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-page)] hover:bg-[var(--admin-hover)] text-xs font-semibold text-[var(--admin-accent)] flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <select
                        aria-label={`Update status for ${l.fullName}`}
                        value={l.status}
                        onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value as any)}
                        className="text-[12px] border border-[var(--admin-border)] rounded-lg px-2 py-1 bg-[var(--admin-page)] text-[var(--admin-text)] cursor-pointer"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="converted">Converted</option>
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-[var(--admin-muted)]">
                  {isLoading ? 'Loading live leads...' : 'No inquiries match this criteria.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dedicated Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--admin-sidebar)] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[var(--admin-border)] flex flex-col text-[var(--admin-text)]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[var(--admin-border)] flex items-start justify-between bg-[var(--admin-soft)]">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[var(--admin-accent)] text-white text-[11px] font-bold flex items-center justify-center">
                    #{selectedLead.serialNumber}
                  </span>
                  <h3 className="text-lg font-bold text-[var(--admin-text)]">{selectedLead.fullName}</h3>
                  {isCheckInLead(selectedLead) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--admin-soft)] text-[var(--admin-text)] border border-[var(--admin-border)] text-[11px] font-medium whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)] shrink-0" />
                      Career Check-in
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[var(--admin-muted)]">
                  Received on {selectedLead.timestampIST || new Date(selectedLead.createdAt).toLocaleString()} • Source: <strong className="text-[var(--admin-text)]">{selectedLead.source}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-xl border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 flex flex-col gap-5">
              {/* Quick Contact & Action Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-[var(--admin-page)] border border-[var(--admin-border)]">
                <a
                  href={`tel:${selectedLead.mobile}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-soft)] hover:opacity-90 text-[12px] font-semibold text-[var(--admin-text)] transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[var(--admin-accent)] shrink-0" />
                  <span className="truncate">{selectedLead.mobile}</span>
                </a>
                {(() => {
                  const digits = selectedLead.mobile.replace(/\D/g, '');
                  const waUrl = digits.length >= 7 ? `https://wa.me/${digits.length === 10 ? '91' + digits : digits}` : null;
                  return waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-soft)] hover:bg-[var(--admin-hover)] text-[12px] font-semibold text-[var(--admin-text)] border border-[var(--admin-border)] transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--admin-muted)]">
                      No WhatsApp link
                    </div>
                  );
                })()}
                {selectedLead.email ? (
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-soft)] hover:opacity-90 text-[12px] font-semibold text-[var(--admin-text)] transition-all truncate"
                  >
                    <Mail className="w-3.5 h-3.5 text-[var(--admin-accent)] shrink-0" />
                    <span className="truncate">{selectedLead.email}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--admin-muted)]">
                    No email provided
                  </div>
                )}
              </div>

              {/* Diagnostic Intent Details (Highlighted Box) */}
              {isCheckInLead(selectedLead) ? (
                (() => {
                  const diagnostic = parseDiagnosticDetails(selectedLead);
                  return (
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--admin-soft)] border border-[var(--admin-border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[var(--admin-accent)] uppercase tracking-wider flex items-center gap-1.5">
                          Candidate Selected Intent & Quiz Answers
                        </span>
                        <span className="text-[11px] text-[var(--admin-muted)] font-medium">Diagnostic Responses</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        <div className="p-3 rounded-xl bg-[var(--admin-page)] border border-[var(--admin-border)] flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                            1. Career Stage
                          </span>
                          <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                            {diagnostic.stage || 'Not specified'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--admin-page)] border border-[var(--admin-border)] flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                            2. Direction Intent (Next 6-12 Mo)
                          </span>
                          <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                            {diagnostic.direction || 'Not specified'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--admin-page)] border border-[var(--admin-border)] flex flex-col gap-0.5 sm:col-span-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                            3. Core Challenge / Bottleneck
                          </span>
                          <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                            {diagnostic.challenge || 'Not specified'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--admin-page)] border border-[var(--admin-border)] flex flex-col gap-0.5 sm:col-span-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                            4. Preferred Guidance Format
                          </span>
                          <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                            {diagnostic.support || 'Not specified'}
                          </span>
                        </div>

                        {diagnostic.role && (
                          <div className="p-3 rounded-xl bg-[var(--admin-page)] border border-[var(--admin-border)] flex flex-col gap-0.5 sm:col-span-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                              Candidate Current / Target Role
                            </span>
                            <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                              {diagnostic.role}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 rounded-2xl bg-[var(--admin-page)] border border-[var(--admin-border)] flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                    General Inquiry Requirement
                  </span>
                  <p className="text-[13px] text-[var(--admin-text)] leading-relaxed">
                    {selectedLead.requirement || 'No detailed requirement provided.'}
                  </p>
                  {selectedLead.planInterest && (
                    <div className="text-[12px] text-[var(--admin-accent)] font-medium mt-1">
                      Plan of Interest: <strong>{selectedLead.planInterest}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Full Intake Notes History */}
              {selectedLead.notes && selectedLead.notes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                    Intake Notes & Log
                  </span>
                  <div className="p-3.5 rounded-xl bg-[var(--admin-page)] border border-[var(--admin-border)] text-[12px] whitespace-pre-wrap leading-relaxed text-[var(--admin-text)]">
                    {selectedLead.notes.map((n) => n.text).join('\n\n')}
                  </div>
                </div>
              )}

              {/* Status Changer Footer */}
              <div className="pt-3 border-t border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[var(--admin-muted)]">Update Status:</span>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as any;
                      handleUpdateLeadStatus(selectedLead.id, nextStatus);
                      setSelectedLead({ ...selectedLead, status: nextStatus });
                    }}
                    className="text-[12px] border border-[var(--admin-border)] rounded-xl px-3 py-1.5 bg-[var(--admin-page)] text-[var(--admin-text)] font-semibold cursor-pointer"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--admin-soft)] hover:bg-[var(--admin-hover)] text-xs font-semibold text-[var(--admin-text)] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Webinars Tab ────────────────────────────────────────────────────────
  const renderWebinars = () => (
    <div className="bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--admin-text)]">Live Career Webinars</h2>
          <p className="text-[12px] text-[var(--admin-muted)]">Manage scheduled sessions, host speakers, and registration fees.</p>
        </div>
      </div>
      <RecordListEditor
        apiBase="/api/webinars"
        labelSingular="Webinar"
        fields={WEBINAR_FIELDS}
        emptyRecord={{
          title: '',
          priceINR: siteConfig.webinarDefaultPriceINR || 199,
          speakerName: '',
          speakerDesignation: '',
          speakerCompany: '',
        }}
        titleField="title"
        subtitleField="category"
        imageField="imageUrl"
        onItemsChange={(items) => setWebinars(items as any)}
      />
    </div>
  );

  // ─── Main Content Switcher ───────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'leads':
        return renderLeads();
      case 'webinars':
        return renderWebinars();
      case 'catalog':
        return <CatalogPanel />;
      case 'people':
        return <PeopleMentorsPanel />;
      case 'candidates':
        return <CandidateContentPanel />;
      case 'payments':
        return <PaymentsPanel />;
      case 'users':
        return <UsersPanel />;
      case 'mail':
        return <MailPanel />;
      case 'seo':
        return <SeoPanel onOpenSettings={() => goTab('settings')} />;
      case 'home-html':
        return <HomeHtmlPanel />;
      case 'team':
        return <AdminTeamPanel />;
      case 'logs':
        return <LogsPanel />;
      case 'notifications':
        return (
          <NotificationsPanel
            items={notifItems}
            unreadIds={unreadIds}
            onOpenItem={(item) => {
              if (item.tab === 'leads') goTab('leads');
              else if (item.tab === 'payments') goTab('payments');
              else if (item.tab === 'users') goTab('users');
            }}
          />
        );
      case 'settings':
        return <SiteSettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className={`admin-console admin-theme-${theme} flex h-screen w-full overflow-hidden bg-[var(--admin-page)]`}>
      {/* Desktop collapsible sidebar */}
      <div className="hidden lg:block h-full">
        {renderSidebar(sidebarCollapsed, true)}
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full w-[260px] max-w-[80vw]">
            {renderSidebar(false, false)}
          </div>
        </div>
      )}

      {/* Main layout container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 h-14 bg-[var(--admin-sidebar)]/85 backdrop-blur-md border-b border-[var(--admin-border)] flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[14px] text-[var(--admin-text)] tracking-tight">Career Buddies</span>
              <span className="text-[var(--admin-muted)] text-[12px]">/</span>
              <span className="text-[13px] text-[var(--admin-muted)]">{TAB_LABELS[activeTab]}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Notifications bell button */}
            <button
              type="button"
              onClick={() => setNotifDrawerOpen((o) => !o)}
              aria-label="Open notifications"
              title="Notifications"
              className="relative p-2 rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {/* Theme switcher */}
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle dark/light mode"
              className="p-2 rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] cursor-pointer transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Account dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title={profile.name}
                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--admin-soft)] hover:bg-[var(--admin-hover)] cursor-pointer"
              >
                <span className="w-6 h-6 rounded-full bg-[var(--admin-page)] text-[10px] font-semibold text-[var(--admin-text)] flex items-center justify-center">
                  {initials(profile.name)}
                </span>
                <span className="hidden sm:block text-[13px] font-medium text-[var(--admin-text)] truncate max-w-[160px]">{profile.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1.5 w-56 z-30 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] shadow-[0_12px_40px_rgba(0,0,0,0.12)] py-1.5"
                >
                  <div className="px-3 py-2 border-b border-[var(--admin-border)] mb-1">
                    <p className="text-[13px] font-medium text-[var(--admin-text)] truncate">{profile.name}</p>
                    <p className="text-[11px] text-[var(--admin-muted)] capitalize">{profile.source === 'team' ? 'Team Member' : 'Owner'}</p>
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

            {/* Export CSV quick button */}
            <button type="button" className="admin-btn hidden sm:flex" onClick={exportLeadsCSV}>
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--admin-text)]">{PAGE_TITLES[activeTab].title}</h1>
            <p className="text-[13px] text-[var(--admin-muted)] mt-0.5">{PAGE_TITLES[activeTab].subtitle}</p>
          </div>
          {renderContent()}
        </div>
      </div>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notifDrawerOpen}
        items={notifItems}
        unreadIds={unreadIds}
        onClose={() => setNotifDrawerOpen(false)}
        onOpenItem={(item) => {
          setNotifDrawerOpen(false);
          if (item.tab === 'leads') goTab('leads');
          else if (item.tab === 'payments') goTab('payments');
          else if (item.tab === 'users') goTab('users');
        }}
        onViewAll={() => {
          setNotifDrawerOpen(false);
          goTab('notifications');
        }}
        onMarkAllRead={markAllRead}
      />
    </div>
  );
};
