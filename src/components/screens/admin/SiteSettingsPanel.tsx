import React, { useEffect, useId, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { SiteSettingsData } from '../../../hooks/useSiteSettings';
import { NavPlacement, resolveNavTabs } from '../../../config/navTabs';
import { DEFAULT_HOME_JOURNEY } from '../../../config/homeJourney';
import { DEFAULT_HOME_TRUST } from '../../../config/homeTrust';
import { DEFAULT_HOME_FAQ } from '../../../config/homeFaq';
import { DEFAULT_HOME_SERVICES } from '../../../config/homeServices';
import { DEFAULT_HOME_MASTERCLASSES, DEFAULT_HOME_CHECK_IN } from '../../../config/homeMasterclasses';
import { DEFAULT_HOME_NEXT_STEP, NEXT_STEP_PAGE_OPTIONS } from '../../../config/homeNextStep';
import { HOME_SECTIONS, HomeSectionId, defaultHomeHtml, defaultSectionVisibility } from '../../../config/homeSections';
import { CardGridSkeleton } from '../../common/Skeleton';
import { RecordListEditor, FieldConfig } from './RecordListEditor';

const EMPTY_SETTINGS: SiteSettingsData = {
  general: {
    brandName: '',
    primaryColor: '',
    secondaryColor: '',
    whatsappNumber: '',
    supportEmail: '',
    phone: '',
    webinarEntryPriceINR: 199,
  },
  header: {
    logoUrl: '',
    navItems: [],
    ctaText: '',
    ctaLink: '',
    announcementText: '',
    announcementVisible: false,
  },
  home: {
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
    heroCtaText: '',
    heroImageUrl: '',
    stats: [],
    nextStepEyebrow: '',
    nextStepTitle: '',
    nextStepDescription: '',
    nextStepCtaText: '',
    nextStepCtaPage: '',
    nextStepCards: [],
    journeyEyebrow: '',
    journeyTitle: '',
    journeyDescription: '',
    journeyCtaEyebrow: '',
    journeyCtaTitle: '',
    journeyCtaDescription: '',
    journeyMoreText: '',
    journeyStages: [],
    trustEyebrow: '',
    trustTitle: '',
    trustDescription: '',
    trustPoints: [],
    trustCommitmentTitle: '',
    trustCommitmentDescription: '',
    trustCommitmentNote: '',
    faqEyebrow: '',
    faqTitle: '',
    faqDescription: '',
    faqItems: [],
    servicesEyebrow: '',
    servicesTitle: '',
    servicesDescription: '',
    masterclassesEyebrow: '',
    masterclassesTitle: '',
    masterclassesDescription: '',
    masterclassesButtonText: '',
    checkInEyebrow: '',
    checkInTitle: '',
    checkInDescription: '',
    checkInButtonText: '',
    sectionVisibility: defaultSectionVisibility(),
    homeHtml: defaultHomeHtml(),
  },
  about: { title: '', mission: '', vision: '', values: [] },
  footer: { description: '', socialLinks: [], copyrightText: '' },
  contact: {
    title: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    mapEmbedUrl: '',
  },
  seo: {
    metaTitle: '',
    metaDescription: '',
    ogImageUrl: '',
    faviconUrl: '',
    analyticsId: '',
  },
  maintenance: {
    enabled: false,
    title: '',
    message: '',
    eta: '',
  },
  resources: { heading: '', subtitle: '' },
};

const SUB_TABS = [
  'General',
  'Header',
  'Home',
  'About',
  'Footer',
  'Contact',
  'SEO',
  'Maintenance',
  'Resources',
] as const;

const RESOURCE_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category (filter chip on the Resources page)' },
  { key: 'summary', label: 'Summary', type: 'textarea' },
  { key: 'content', label: 'Full article (markdown supported)', type: 'textarea' },
  { key: 'readTime', label: 'Read time (e.g. 6 min read)' },
  { key: 'publishedDate', label: 'Published date (e.g. June 2026)' },
  { key: 'tags', label: 'Tags', type: 'tags' },
  { key: 'author', label: 'Author' },
  { key: 'authorRole', label: 'Author role / company' },
];

type SubTab = (typeof SUB_TABS)[number];

const HOME_PANELS = [
  { id: 'visibility', label: 'Show / hide', hint: 'Turn Home sections on or off' },
  { id: 'hero', label: 'Hero', hint: 'Top banner copy and cards' },
  { id: 'nextStep', label: 'Find your next step', hint: 'Decision cards and links' },
  { id: 'journey', label: '7-stage journey', hint: 'Stages and bottom CTA' },
  { id: 'trust', label: 'Why Trust', hint: 'Trust cards and commitment' },
  { id: 'faq', label: 'FAQ', hint: 'Heading and questions' },
  { id: 'masterclasses', label: 'Live masterclasses', hint: 'Section heading' },
  { id: 'checkIn', label: 'Career check-in', hint: 'Banner copy' },
  { id: 'services', label: 'Programs heading', hint: 'Title above program cards' },
  { id: 'other', label: 'Edited elsewhere', hint: 'Plans, mentors, leadership' },
] as const;

type HomePanelId = (typeof HOME_PANELS)[number]['id'];
const HOME_PANEL_KEY = 'cb_admin_home_panel';

function readHomePanel(): HomePanelId {
  try {
    const stored = localStorage.getItem(HOME_PANEL_KEY) || '';
    if (HOME_PANELS.some((panel) => panel.id === stored)) return stored as HomePanelId;
  } catch {
    /* ignore */
  }
  return 'hero';
}

const HOME_PANEL_SECTION_MAP: Partial<Record<HomePanelId, HomeSectionId>> = {
  hero: 'hero',
  nextStep: 'nextStep',
  journey: 'journey',
  trust: 'trust',
  faq: 'faq',
  masterclasses: 'masterclasses',
  checkIn: 'checkIn',
  services: 'services',
};

const inputClass = 'w-full px-3';
const labelClass = 'block text-[12px] font-medium text-[var(--admin-text)] mb-1.5';
const addBtnClass = 'inline-flex items-center gap-1 text-[12px] font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer';
const nestedCardClass = 'flex flex-col gap-2 p-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-page)]';
const mutedClass = 'text-[12px] text-[var(--admin-muted)]';

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const fid = useId();
  return (
    <div>
      <label htmlFor={fid} className={labelClass}>{label}</label>
      <input id={fid}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const fid = useId();
  return (
    <div>
      <label htmlFor={fid} className={labelClass}>{label}</label>
      <textarea id={fid}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

// Reused for the four "list of two text fields" shapes in Site Settings:
// header.navItems {label,page}, home.stats {label,value},
// about.values {title,description}, footer.socialLinks {platform,url}.
function PairListEditor({
  label,
  items,
  keyA,
  keyB,
  labelA,
  labelB,
  onChange,
}: {
  label: string;
  items: Record<string, string>[];
  keyA: string;
  keyB: string;
  labelA: string;
  labelB: string;
  onChange: (items: Record<string, string>[]) => void;
}) {
  const update = (index: number, key: string, value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...items, { [keyA]: '', [keyB]: '' }]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={labelClass}>{label}</span>
        <button
          type="button"
          onClick={add}
          className={addBtnClass}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className={mutedClass}>No entries yet.</p>
        )}
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <span className={labelClass}>{labelA}</span>
              <input
                type="text"
                aria-label={`${label}: ${labelA}`}
                placeholder={labelA}
                value={item[keyA] || ''}
                onChange={(e) => update(index, keyA, e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>{labelB}</span>
              <input
                type="text"
                aria-label={`${label}: ${labelB}`}
                placeholder={labelB}
                value={item[keyB] || ''}
                onChange={(e) => update(index, keyB, e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="w-[38px] h-[38px] text-red-600 hover:bg-red-50 rounded-lg cursor-pointer shrink-0 flex items-center justify-center"
              aria-label={`Remove ${label} entry`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqListEditor({
  items,
  onChange,
}: {
  items: { question: string; answer: string }[];
  onChange: (items: { question: string; answer: string }[]) => void;
}) {
  const update = (index: number, key: 'question' | 'answer', value: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={labelClass}>Questions</span>
        <button
          type="button"
          onClick={() => onChange([...items, { question: '', answer: '' }])}
          className={addBtnClass}
        >
          <Plus className="w-3 h-3" />
          Add question
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={index} className={nestedCardClass}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--admin-muted)]">Q{index + 1}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                aria-label={`Remove question ${index + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <span className={labelClass}>Question</span>
              <input
                type="text"
                aria-label={`FAQ ${index + 1} question`}
                placeholder="Question"
                value={item.question || ''}
                onChange={(e) => update(index, 'question', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>Answer</span>
              <textarea
                aria-label={`FAQ ${index + 1} answer`}
                placeholder="Answer"
                rows={3}
                value={item.answer || ''}
                onChange={(e) => update(index, 'answer', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextStepCardEditor({
  items,
  onChange,
}: {
  items: {
    title: string;
    subtitle: string;
    description: string;
    ctaText: string;
    targetPage: string;
    badge: string;
    color: string;
  }[];
  onChange: (
    items: {
      title: string;
      subtitle: string;
      description: string;
      ctaText: string;
      targetPage: string;
      badge: string;
      color: string;
    }[]
  ) => void;
}) {
  const empty = {
    title: '',
    subtitle: '',
    description: '',
    ctaText: '',
    targetPage: 'home',
    badge: '',
    color: 'blue',
  };
  const update = (index: number, key: keyof typeof empty, value: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-[var(--admin-text)]">Cards</span>
        <button
          type="button"
          onClick={() => onChange([...items, { ...empty }])}
          className={addBtnClass}
        >
          <Plus className="w-3 h-3" />
          Add card
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={index} className={nestedCardClass}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--admin-muted)]">Card {index + 1}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                aria-label={`Remove card ${index + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <span className={labelClass}>Title</span>
                <input
                  type="text"
                  aria-label={`Card ${index + 1} title`}
                  placeholder="Title"
                  value={item.title || ''}
                  onChange={(e) => update(index, 'title', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <span className={labelClass}>Subtitle</span>
                <input
                  type="text"
                  aria-label={`Card ${index + 1} subtitle`}
                  placeholder="Subtitle"
                  value={item.subtitle || ''}
                  onChange={(e) => update(index, 'subtitle', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <span className={labelClass}>Description</span>
                <textarea
                  aria-label={`Card ${index + 1} description`}
                  placeholder="Description"
                  rows={3}
                  value={item.description || ''}
                  onChange={(e) => update(index, 'description', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>Button text</span>
                <input
                  type="text"
                  aria-label={`Card ${index + 1} button text`}
                  placeholder="Button text"
                  value={item.ctaText || ''}
                  onChange={(e) => update(index, 'ctaText', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>Badge</span>
                <input
                  type="text"
                  aria-label={`Card ${index + 1} badge`}
                  placeholder="Badge"
                  value={item.badge || ''}
                  onChange={(e) => update(index, 'badge', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>Opens page</span>
                <select
                  aria-label={`Card ${index + 1} page`}
                  value={item.targetPage || 'home'}
                  onChange={(e) => update(index, 'targetPage', e.target.value)}
                  className={inputClass}
                >
                  {NEXT_STEP_PAGE_OPTIONS.map((option) => (
                    <option key={option.page} value={option.page}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className={labelClass}>Colour</span>
                <select
                  aria-label={`Card ${index + 1} colour`}
                  value={item.color === 'green' ? 'green' : 'blue'}
                  onChange={(e) => update(index, 'color', e.target.value)}
                  className={inputClass}
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageListEditor({
  items,
  onChange,
}: {
  items: { title: string; badge: string; desc: string }[];
  onChange: (items: { title: string; badge: string; desc: string }[]) => void;
}) {
  const update = (index: number, key: 'title' | 'badge' | 'desc', value: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={labelClass}>Journey stages</span>
        <button
          type="button"
          onClick={() => onChange([...items, { title: '', badge: '', desc: '' }])}
          className={addBtnClass}
        >
          <Plus className="w-3 h-3" />
          Add stage
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={index} className={nestedCardClass}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--admin-muted)]">Stage {String(index + 1).padStart(2, '0')}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                aria-label={`Remove stage ${index + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className={labelClass}>Title</span>
                <input
                  type="text"
                  aria-label={`Stage ${index + 1} title`}
                  placeholder="Stage title"
                  value={item.title || ''}
                  onChange={(e) => update(index, 'title', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <span className={labelClass}>Badge</span>
                <input
                  type="text"
                  aria-label={`Stage ${index + 1} badge`}
                  placeholder="Badge (e.g. Next Step)"
                  value={item.badge || ''}
                  onChange={(e) => update(index, 'badge', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <span className={labelClass}>Description</span>
                <textarea
                  aria-label={`Stage ${index + 1} description`}
                  placeholder="Stage description"
                  rows={2}
                  value={item.desc || ''}
                  onChange={(e) => update(index, 'desc', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsBlock({
  id,
  step,
  title,
  hint,
  enabled,
  onToggleEnabled,
  children,
}: {
  id: string;
  step?: string;
  title: string;
  hint: string;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--admin-border)]">
        <div>
          {step && <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-accent)]">{step}</span>}
          <h3 className="text-[17px] font-semibold text-[var(--admin-text)]">{title}</h3>
          <p className="text-[13px] text-[var(--admin-muted)] mt-0.5">{hint}</p>
        </div>
        {onToggleEnabled !== undefined && (
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto bg-[var(--admin-soft)] px-3.5 py-2 rounded-xl border border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-rose-500 ring-2 ring-rose-500/20'}`} />
              <div className="text-left">
                <span className="block text-[12px] font-semibold text-[var(--admin-text)] leading-tight">
                  {enabled ? 'Visible on Home' : 'Disabled on Home'}
                </span>
                <span className="block text-[10px] text-[var(--admin-muted)] leading-tight">
                  {enabled ? 'Section is active' : 'Section is hidden'}
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`Toggle ${title} visibility on Home page`}
              onClick={onToggleEnabled}
              className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer transition-colors ${
                enabled ? 'bg-[#007aff]' : 'bg-[#d1d1d6] dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {onToggleEnabled !== undefined && !enabled && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-[12px]">
          <span className="text-[16px] leading-none">⚠️</span>
          <div>
            <p className="font-semibold">This section is currently disabled</p>
            <p className="text-[11px] opacity-90 mt-0.5">
              It will not appear on the Home page for visitors. Flip the switch above to enable and show it again.
            </p>
          </div>
        </div>
      )}

      {children}
    </section>
  );
}

const DEFAULT_HERO_MILESTONES = [
  {
    key: 'top',
    name: 'Top Card (Staff & Principal Apex Node)',
    defaultLabel: 'Staff & Principal Track',
    defaultValue: 'High-Impact Architecture & Leadership',
    defaultBadge: '',
  },
  {
    key: 'mid',
    name: 'Middle Card (1:1 Practitioner Node)',
    defaultLabel: '1:1 Practitioner Mentorship',
    defaultValue: 'FAANG+ & Tier-1 Tech Ecosystem Leaders',
    defaultBadge: 'Active',
  },
  {
    key: 'bottom',
    name: 'Bottom Card (Diagnostic Roadmap Node)',
    defaultLabel: 'Diagnostic & Roadmap Formulation',
    defaultValue: 'Step-by-step career acceleration plan',
    defaultBadge: '',
  },
];

function HeroFloatingCardsEditor({
  stats,
  onChange,
}: {
  stats: { label?: string; value?: string; badge?: string }[];
  onChange: (stats: { label: string; value: string; badge?: string }[]) => void;
}) {
  const updateCard = (index: number, patch: Partial<{ label: string; value: string; badge: string }>) => {
    const next = [0, 1, 2].map((i) => {
      const existing = stats[i] || { label: '', value: '', badge: '' };
      if (i === index) {
        return {
          label: patch.label !== undefined ? patch.label : (existing.label || ''),
          value: patch.value !== undefined ? patch.value : (existing.value || ''),
          badge: patch.badge !== undefined ? patch.badge : (existing.badge || ''),
        };
      }
      return {
        label: existing.label || '',
        value: existing.value || '',
        badge: existing.badge || '',
      };
    });
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="border-t border-[var(--admin-border)] pt-4">
        <label className={labelClass}>Hero Floating Milestone Cards (3 Diagram Cards)</label>
        <p className="text-[12px] text-[var(--admin-muted)] mt-0.5">
          Customize the 3 milestone cards shown on the Hero graphic. Leave any field blank to automatically use the current default website copy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {DEFAULT_HERO_MILESTONES.map((milestone, idx) => {
          const current = stats[idx] || {};
          const currentLabel = current.label || '';
          const currentValue = current.value || '';
          const currentBadge = current.badge || '';
          const isCustomized = Boolean(currentLabel.trim() || currentValue.trim() || currentBadge.trim());

          return (
            <div
              key={milestone.key}
              className="p-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-page)] flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--admin-soft)] text-[11px] font-bold text-[var(--admin-accent)] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                    {milestone.name}
                  </span>
                </div>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={() => updateCard(idx, { label: '', value: '', badge: '' })}
                    className="text-[11px] font-medium text-[var(--admin-accent)] hover:underline cursor-pointer"
                  >
                    Reset to default
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className={labelClass}>Card Title / Heading</span>
                  <input
                    type="text"
                    value={currentLabel}
                    onChange={(e) => updateCard(idx, { label: e.target.value })}
                    placeholder={`Default: ${milestone.defaultLabel}`}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-[var(--admin-muted)] mt-1 truncate">
                    Default: <span className="font-medium text-[var(--admin-text)]">{milestone.defaultLabel}</span>
                  </p>
                </div>

                <div>
                  <span className={labelClass}>Card Subtitle / Description</span>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => updateCard(idx, { value: e.target.value })}
                    placeholder={`Default: ${milestone.defaultValue}`}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-[var(--admin-muted)] mt-1 truncate">
                    Default: <span className="font-medium text-[var(--admin-text)]">{milestone.defaultValue}</span>
                  </p>
                </div>
              </div>

              {idx === 1 && (
                <div className="sm:w-1/2 pr-0 sm:pr-1.5">
                  <span className={labelClass}>Badge Tag (e.g. Active, Live)</span>
                  <input
                    type="text"
                    value={currentBadge}
                    onChange={(e) => updateCard(idx, { badge: e.target.value })}
                    placeholder="Default: Active"
                    className={inputClass}
                  />
                  <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                    Small green pill. Leave blank to show "{milestone.defaultBadge}".
                  </p>
                </div>
              )}

              {/* Live Preview */}
              <div className="p-3 rounded-xl bg-[#031533] border border-white/10 flex items-center justify-between gap-3 text-white">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-white truncate">
                      {currentLabel.trim() || milestone.defaultLabel}
                    </span>
                    {(currentBadge.trim() || milestone.defaultBadge) && (
                      <span className="text-[9px] font-bold text-[#002869] bg-[#79fd8d] px-1.5 py-0.2 rounded-full">
                        {currentBadge.trim() || milestone.defaultBadge}
                      </span>
                    )}
                    {idx === 0 && !currentBadge.trim() && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#79fd8d] animate-pulse" />
                    )}
                  </div>
                  <p className="text-[10px] text-[#dae2ff]/80 truncate mt-0.5">
                    {currentValue.trim() || milestone.defaultValue}
                  </p>
                </div>
                <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono shrink-0 ${
                  isCustomized ? 'bg-[#007aff]/20 text-[#a0c4ff] border border-[#007aff]/30' : 'bg-white/5 text-gray-400'
                }`}>
                  {isCustomized ? 'Custom' : 'Default'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mergeSettings(raw: any): SiteSettingsData {
  const rest = { ...(raw || {}) };
  delete rest._id;
  delete rest.__v;
  delete rest.createdAt;
  delete rest.updatedAt;
  return {
    ...EMPTY_SETTINGS,
    ...rest,
    general: { ...EMPTY_SETTINGS.general, ...rest.general },
    header: {
      ...EMPTY_SETTINGS.header,
      ...rest.header,
      navItems: resolveNavTabs(rest.header?.navItems),
    },
    home: {
      ...EMPTY_SETTINGS.home,
      ...rest.home,
      nextStepCards:
        rest.home?.nextStepCards?.length > 0
          ? rest.home.nextStepCards
          : DEFAULT_HOME_NEXT_STEP.cards.map((card) => ({ ...card })),
      journeyStages:
        rest.home?.journeyStages?.length > 0
          ? rest.home.journeyStages
          : DEFAULT_HOME_JOURNEY.stages.map((stage) => ({ ...stage })),
      trustPoints:
        rest.home?.trustPoints?.length > 0
          ? rest.home.trustPoints
          : DEFAULT_HOME_TRUST.points.map((point) => ({ ...point })),
      faqItems:
        rest.home?.faqItems?.length > 0
          ? rest.home.faqItems
          : DEFAULT_HOME_FAQ.items.map((item) => ({ ...item })),
      sectionVisibility: { ...defaultSectionVisibility(), ...rest.home?.sectionVisibility },
      homeHtml: { ...defaultHomeHtml(), ...rest.home?.homeHtml },
    },
    about: { ...EMPTY_SETTINGS.about, ...rest.about },
    footer: { ...EMPTY_SETTINGS.footer, ...rest.footer },
    contact: { ...EMPTY_SETTINGS.contact, ...rest.contact },
    seo: { ...EMPTY_SETTINGS.seo, ...rest.seo },
    maintenance: { ...EMPTY_SETTINGS.maintenance, ...rest.maintenance },
    resources: { ...EMPTY_SETTINGS.resources, ...rest.resources },
  };
}

function settingsPayload(settings: SiteSettingsData) {
  return {
    general: settings.general,
    header: { ...settings.header, navItems: resolveNavTabs(settings.header.navItems) },
    home: settings.home,
    about: settings.about,
    footer: settings.footer,
    contact: settings.contact,
    seo: settings.seo,
    maintenance: settings.maintenance,
    resources: settings.resources,
  };
}

export const SiteSettingsPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('General');
  const [homePanel, setHomePanelState] = useState<HomePanelId>(readHomePanel);
  const setHomePanel = (id: HomePanelId) => {
    setHomePanelState(id);
    try {
      localStorage.setItem(HOME_PANEL_KEY, id);
    } catch {
      /* ignore */
    }
  };
  const [settings, setSettings] = useState<SiteSettingsData>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/site-settings');
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(mergeSettings(data.settings));
        }
      } catch (err) {
        console.error('Failed to load site settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSection = <K extends keyof SiteSettingsData>(
    section: K,
    patch: Partial<SiteSettingsData[K]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
  };

  const isHomeSectionEnabled = (id: HomeSectionId) => {
    return settings.home.sectionVisibility?.[id] !== false;
  };

  const toggleHomeSection = (id: HomeSectionId) => {
    const current = isHomeSectionEnabled(id);
    updateSection('home', {
      sectionVisibility: {
        ...defaultSectionVisibility(),
        ...settings.home.sectionVisibility,
        [id]: !current,
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await adminFetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload(settings)),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(mergeSettings(data.settings));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        setSaveError(data.error || 'Unable to save Site Settings.');
      }
    } catch (err) {
      setSaveError('Unable to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    const maintenance = { ...settings.maintenance, enabled };
    const next = mergeSettings({ ...settings, maintenance });
    setSettings(next);
    setSaving(true);
    setSaveError('');
    try {
      const res = await adminFetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(mergeSettings(data.settings));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        setSaveError(data.error || 'Unable to update maintenance mode.');
        setSettings(settings);
      }
    } catch {
      setSaveError('Unable to reach the server. Please try again.');
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--admin-sidebar)] rounded-2xl p-6 border border-[var(--admin-border)]">
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--admin-text)]">Site settings</h2>
          <p className="text-[12px] text-[var(--admin-muted)] mt-1 max-w-xl">
            Edits go live on the public site. Leave a field blank to keep the current copy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium admin-tone-ok">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </div>
          )}
          {saveError && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium admin-tone-bad">
              <AlertCircle className="w-3.5 h-3.5" />
              {saveError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="admin-btn"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-[var(--admin-border)] pb-4">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSubTab(tab)}
            className={`h-8 px-3 rounded-lg text-[12px] font-medium cursor-pointer border ${
              subTab === tab
                ? 'bg-[var(--admin-active)] text-[var(--admin-text)] border-[var(--admin-border)]'
                : 'bg-transparent text-[var(--admin-muted)] border-[var(--admin-border)] hover:bg-[var(--admin-hover)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {subTab === 'General' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Brand Name"
            value={settings.general.brandName}
            onChange={(v) => updateSection('general', { brandName: v })}
          />
          <Field
            label="WhatsApp Number"
            value={settings.general.whatsappNumber}
            onChange={(v) => updateSection('general', { whatsappNumber: v })}
          />
          <Field
            label="Support Email"
            value={settings.general.supportEmail}
            onChange={(v) => updateSection('general', { supportEmail: v })}
            type="email"
          />
          <Field
            label="Phone"
            value={settings.general.phone}
            onChange={(v) => updateSection('general', { phone: v })}
          />
          <Field
            label="Primary Color"
            value={settings.general.primaryColor}
            onChange={(v) => updateSection('general', { primaryColor: v })}
          />
          <Field
            label="Secondary Color"
            value={settings.general.secondaryColor}
            onChange={(v) => updateSection('general', { secondaryColor: v })}
          />
          <p className="sm:col-span-2 text-[12px] text-[var(--admin-muted)]">
            Site-wide webinar buttons use the lowest price from live webinars in Catalog.
            If no live webinar is listed, those buttons stay hidden.
          </p>
        </div>
      )}

      {subTab === 'Header' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Logo URL / path"
              value={settings.header.logoUrl}
              onChange={(v) => updateSection('header', { logoUrl: v })}
            />
            <Field
              label="Header CTA Text"
              value={settings.header.ctaText}
              onChange={(v) => updateSection('header', { ctaText: v })}
            />
            <Field
              label="Header CTA Link"
              value={settings.header.ctaLink}
              onChange={(v) => updateSection('header', { ctaLink: v })}
            />
            <Field
              label="Announcement Text"
              value={settings.header.announcementText}
              onChange={(v) =>
                updateSection('header', { announcementText: v })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[var(--admin-text)] cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={settings.header.announcementVisible}
              onChange={(e) =>
                updateSection('header', {
                  announcementVisible: e.target.checked,
                })
              }
            />
            Show announcement bar
          </label>
          <div>
            <p className={labelClass}>Public navigation tabs</p>
            <p className="text-[12px] text-[var(--admin-muted)] mb-3">
              Turn tabs on or off for the header, More menu, mobile menu, and footer. Home stays reachable from the logo even if its tab is hidden.
            </p>
            <div className="flex flex-col gap-2">
              {resolveNavTabs(settings.header.navItems).map((item) => (
                <div
                  key={item.page}
                  className="grid grid-cols-1 sm:grid-cols-[auto_1fr_160px] gap-2 items-center bg-[var(--admin-page)] border border-[var(--admin-border)] rounded-xl p-2.5"
                >
                  <label className="flex items-center gap-2 text-[13px] text-[var(--admin-text)] cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) =>
                        updateSection('header', {
                          navItems: resolveNavTabs(settings.header.navItems).map((tab) =>
                            tab.page === item.page ? { ...tab, enabled: e.target.checked } : tab
                          ),
                        })
                      }
                    />
                    Show
                  </label>
                  <input
                    aria-label={`${item.label} tab label`}
                    value={item.label}
                    onChange={(e) =>
                      updateSection('header', {
                        navItems: resolveNavTabs(settings.header.navItems).map((tab) =>
                          tab.page === item.page ? { ...tab, label: e.target.value } : tab
                        ),
                      })
                    }
                    className={inputClass}
                  />
                  <select
                    aria-label={`${item.label} placement`}
                    value={item.placement}
                    onChange={(e) =>
                      updateSection('header', {
                        navItems: resolveNavTabs(settings.header.navItems).map((tab) =>
                          tab.page === item.page ? { ...tab, placement: e.target.value as NavPlacement } : tab
                        ),
                      })
                    }
                    className={inputClass}
                  >
                    <option value="top">Top bar</option>
                    <option value="more">More menu</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'Home' && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--admin-muted)]">
            Choose a Home section, then edit it. Blank fields keep the current site copy.
          </p>
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] overflow-hidden grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="lg:hidden p-4 border-b border-[var(--admin-border)]">
              <label className={labelClass} htmlFor="home-panel-select">Section</label>
              <select
                id="home-panel-select"
                value={homePanel}
                onChange={(e) => setHomePanel(e.target.value as HomePanelId)}
                className={inputClass}
              >
                {HOME_PANELS.map((panel) => (
                  <option key={panel.id} value={panel.id}>
                    {panel.label}
                  </option>
                ))}
              </select>
            </div>
            <nav className="hidden lg:flex flex-col py-3 border-r border-[var(--admin-border)]">
              {HOME_PANELS.map((panel) => {
                const on = homePanel === panel.id;
                const secId = HOME_PANEL_SECTION_MAP[panel.id];
                const isOff = secId && !isHomeSectionEnabled(secId);
                return (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => setHomePanel(panel.id)}
                    className={`relative w-full text-left px-4 h-10 text-[13px] font-medium cursor-pointer flex items-center justify-between transition-colors ${
                      on
                        ? 'bg-[var(--admin-soft)] text-[var(--admin-text)]'
                        : 'text-[var(--admin-text)] hover:bg-[var(--admin-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {on && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--admin-accent)]" />}
                      <span className="truncate">{panel.label}</span>
                    </div>
                    {isOff && (
                      <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        Off
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="min-w-0 p-5 sm:p-6">

          {homePanel === 'visibility' && (
          <SettingsBlock
            id="home-visibility"
            step="All sections"
            title="Show or hide Home sections"
            hint="Turn a section off to remove it from the Home page. Sections without copy fields still get a toggle."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HOME_SECTIONS.map((section) => {
                const on = settings.home.sectionVisibility?.[section.id] !== false;
                return (
                  <div
                    key={section.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--admin-text)]">{section.label}</p>
                      <p className="text-[11px] text-[var(--admin-muted)]">{section.hint}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${on ? 'Hide' : 'Show'} ${section.label}`}
                      onClick={() =>
                        updateSection('home', {
                          sectionVisibility: {
                            ...defaultSectionVisibility(),
                            ...settings.home.sectionVisibility,
                            [section.id]: !on,
                          },
                        })
                      }
                      className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer transition-colors ${
                        on ? 'bg-[#007aff]' : 'bg-[#d1d1d6]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          on ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </SettingsBlock>
          )}

          {homePanel === 'hero' && (
          <SettingsBlock
            id="home-hero"
            step="Section 1"
            title="Hero"
            hint="Top of Home. Heading and subheading on the left. First 3 cards on the right."
            enabled={isHomeSectionEnabled('hero')}
            onToggleEnabled={() => toggleHomeSection('hero')}
          >
            <TextAreaField
              label="Heading"
              value={settings.home.heroTitle}
              onChange={(v) => updateSection('home', { heroTitle: v })}
              rows={2}
              placeholder="Accelerate Your Career with Structured Practitioner Guidance"
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.heroDescription}
              onChange={(v) => updateSection('home', { heroDescription: v })}
              placeholder="Navigate career transitions, level up to Senior and Staff engineering, and master system design with verified leaders from top global technology ecosystems."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label="Badge (small pill above the heading)"
                value={settings.home.heroSubtitle}
                onChange={(v) => updateSection('home', { heroSubtitle: v })}
                placeholder="Bridging the gap between aspiration and achievement"
              />
              <Field
                label="CTA button text"
                value={settings.home.heroCtaText}
                onChange={(v) => updateSection('home', { heroCtaText: v })}
                placeholder="Connect with Our Advisor"
              />
            </div>
            <Field
              label="Image URL"
              value={settings.home.heroImageUrl}
              onChange={(v) => updateSection('home', { heroImageUrl: v })}
            />
            <HeroFloatingCardsEditor
              stats={settings.home.stats || []}
              onChange={(nextStats) =>
                updateSection('home', { stats: nextStats })
              }
            />
          </SettingsBlock>
          )}

          {homePanel === 'nextStep' && (
          <SettingsBlock
            id="home-next-step"
            step="Section 2"
            title="Find your next step"
            hint="The four decision cards. Each card has a dropdown for which page it opens."
            enabled={isHomeSectionEnabled('nextStep')}
            onToggleEnabled={() => toggleHomeSection('nextStep')}
          >
            <Field
              label="Badge"
              value={settings.home.nextStepEyebrow}
              onChange={(v) => updateSection('home', { nextStepEyebrow: v })}
              placeholder={DEFAULT_HOME_NEXT_STEP.eyebrow}
            />
            <TextAreaField
              label="Heading"
              value={settings.home.nextStepTitle}
              onChange={(v) => updateSection('home', { nextStepTitle: v })}
              rows={2}
              placeholder={DEFAULT_HOME_NEXT_STEP.title}
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.nextStepDescription}
              onChange={(v) => updateSection('home', { nextStepDescription: v })}
              placeholder={DEFAULT_HOME_NEXT_STEP.description}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Unsure button text"
                value={settings.home.nextStepCtaText}
                onChange={(v) => updateSection('home', { nextStepCtaText: v })}
                placeholder={DEFAULT_HOME_NEXT_STEP.ctaText}
              />
              <div>
                <span className={labelClass}>Unsure button page</span>
                <select
                  aria-label="Unsure button page"
                  value={settings.home.nextStepCtaPage || DEFAULT_HOME_NEXT_STEP.ctaPage}
                  onChange={(e) => updateSection('home', { nextStepCtaPage: e.target.value })}
                  className={inputClass}
                >
                  {NEXT_STEP_PAGE_OPTIONS.map((option) => (
                    <option key={option.page} value={option.page}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <NextStepCardEditor
              items={settings.home.nextStepCards}
              onChange={(items) => updateSection('home', { nextStepCards: items })}
            />
          </SettingsBlock>
          )}

          {homePanel === 'journey' && (
          <SettingsBlock
            id="home-journey"
            step="Section 3"
            title="7-stage journey"
            hint="The navy block: How CareerBuddies Accelerates Your Career."
            enabled={isHomeSectionEnabled('journey')}
            onToggleEnabled={() => toggleHomeSection('journey')}
          >
            <p className="text-[12px] font-medium text-[var(--admin-text)]">Section title</p>
            <Field
              label="Badge"
              value={settings.home.journeyEyebrow}
              onChange={(v) => updateSection('home', { journeyEyebrow: v })}
              placeholder={DEFAULT_HOME_JOURNEY.eyebrow}
            />
            <TextAreaField
              label="Heading"
              value={settings.home.journeyTitle}
              onChange={(v) => updateSection('home', { journeyTitle: v })}
              rows={2}
              placeholder={DEFAULT_HOME_JOURNEY.title}
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.journeyDescription}
              onChange={(v) => updateSection('home', { journeyDescription: v })}
              placeholder={DEFAULT_HOME_JOURNEY.description}
            />
            <p className="text-[12px] font-medium text-[var(--admin-text)] pt-1">Stage cards</p>
            <StageListEditor
              items={settings.home.journeyStages}
              onChange={(items) => updateSection('home', { journeyStages: items })}
            />
            <p className="text-[12px] font-medium text-[var(--admin-text)] pt-1">Bottom CTA card</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label="CTA badge"
                value={settings.home.journeyCtaEyebrow}
                onChange={(v) => updateSection('home', { journeyCtaEyebrow: v })}
                placeholder={DEFAULT_HOME_JOURNEY.ctaEyebrow}
              />
              <Field
                label="CTA heading"
                value={settings.home.journeyCtaTitle}
                onChange={(v) => updateSection('home', { journeyCtaTitle: v })}
                placeholder={DEFAULT_HOME_JOURNEY.ctaTitle}
              />
            </div>
            <TextAreaField
              label="CTA subheading"
              value={settings.home.journeyCtaDescription}
              onChange={(v) => updateSection('home', { journeyCtaDescription: v })}
              placeholder={DEFAULT_HOME_JOURNEY.ctaDescription}
            />
            <Field
              label="View more button"
              value={settings.home.journeyMoreText}
              onChange={(v) => updateSection('home', { journeyMoreText: v })}
              placeholder={DEFAULT_HOME_JOURNEY.moreText}
            />
          </SettingsBlock>
          )}

          {homePanel === 'trust' && (
          <SettingsBlock
            id="home-trust"
            step="Section 3"
            title="Why Trust CareerBuddies"
            hint="The trust cards and commitment block near the bottom of Home. Also used on About."
            enabled={isHomeSectionEnabled('trust')}
            onToggleEnabled={() => toggleHomeSection('trust')}
          >
            <Field
              label="Badge"
              value={settings.home.trustEyebrow}
              onChange={(v) => updateSection('home', { trustEyebrow: v })}
              placeholder={DEFAULT_HOME_TRUST.eyebrow}
            />
            <TextAreaField
              label="Heading"
              value={settings.home.trustTitle}
              onChange={(v) => updateSection('home', { trustTitle: v })}
              rows={2}
              placeholder={DEFAULT_HOME_TRUST.title}
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.trustDescription}
              onChange={(v) => updateSection('home', { trustDescription: v })}
              placeholder={DEFAULT_HOME_TRUST.description}
            />
            <PairListEditor
              label="Trust cards (title + description)"
              items={settings.home.trustPoints}
              keyA="title"
              keyB="description"
              labelA="Card title"
              labelB="Card description"
              onChange={(items) => updateSection('home', { trustPoints: items as any })}
            />
            <Field
              label="Commitment heading"
              value={settings.home.trustCommitmentTitle}
              onChange={(v) => updateSection('home', { trustCommitmentTitle: v })}
              placeholder={DEFAULT_HOME_TRUST.commitmentTitle}
            />
            <TextAreaField
              label="Commitment text"
              value={settings.home.trustCommitmentDescription}
              onChange={(v) => updateSection('home', { trustCommitmentDescription: v })}
              placeholder={DEFAULT_HOME_TRUST.commitmentDescription}
            />
            <Field
              label="Commitment footer"
              value={settings.home.trustCommitmentNote}
              onChange={(v) => updateSection('home', { trustCommitmentNote: v })}
              placeholder={DEFAULT_HOME_TRUST.commitmentNote}
            />
          </SettingsBlock>
          )}

          {homePanel === 'faq' && (
          <SettingsBlock
            id="home-faq"
            step="Section 4"
            title="FAQ"
            hint="Heading plus the question cards on Home. Add, edit, or remove questions here."
            enabled={isHomeSectionEnabled('faq')}
            onToggleEnabled={() => toggleHomeSection('faq')}
          >
            <Field
              label="Badge"
              value={settings.home.faqEyebrow}
              onChange={(v) => updateSection('home', { faqEyebrow: v })}
              placeholder={DEFAULT_HOME_FAQ.eyebrow}
            />
            <TextAreaField
              label="Heading"
              value={settings.home.faqTitle}
              onChange={(v) => updateSection('home', { faqTitle: v })}
              rows={2}
              placeholder={DEFAULT_HOME_FAQ.title}
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.faqDescription}
              onChange={(v) => updateSection('home', { faqDescription: v })}
              placeholder={DEFAULT_HOME_FAQ.description}
            />
            <FaqListEditor
              items={settings.home.faqItems}
              onChange={(items) => updateSection('home', { faqItems: items })}
            />
          </SettingsBlock>
          )}

          {homePanel === 'masterclasses' && (
          <SettingsBlock
            id="home-masterclasses"
            step="Section 6"
            title="Live masterclasses"
            hint="Heading on Home. The section still hides when there is no live webinar."
            enabled={isHomeSectionEnabled('masterclasses')}
            onToggleEnabled={() => toggleHomeSection('masterclasses')}
          >
            <Field
              label="Badge"
              value={settings.home.masterclassesEyebrow}
              onChange={(v) => updateSection('home', { masterclassesEyebrow: v })}
              placeholder={DEFAULT_HOME_MASTERCLASSES.eyebrow}
            />
            <TextAreaField
              label="Heading"
              value={settings.home.masterclassesTitle}
              onChange={(v) => updateSection('home', { masterclassesTitle: v })}
              rows={2}
              placeholder={DEFAULT_HOME_MASTERCLASSES.title}
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.masterclassesDescription}
              onChange={(v) => updateSection('home', { masterclassesDescription: v })}
              placeholder={DEFAULT_HOME_MASTERCLASSES.description}
            />
            <Field
              label="Button text"
              value={settings.home.masterclassesButtonText}
              onChange={(v) => updateSection('home', { masterclassesButtonText: v })}
              placeholder={DEFAULT_HOME_MASTERCLASSES.buttonText}
            />
          </SettingsBlock>
          )}

          {homePanel === 'checkIn' && (
          <SettingsBlock
            id="home-checkin"
            step="Section 7"
            title="Career check-in banner"
            hint="The navy banner on Home."
            enabled={isHomeSectionEnabled('checkIn')}
            onToggleEnabled={() => toggleHomeSection('checkIn')}
          >
            <Field
              label="Badge"
              value={settings.home.checkInEyebrow}
              onChange={(v) => updateSection('home', { checkInEyebrow: v })}
              placeholder={DEFAULT_HOME_CHECK_IN.eyebrow}
            />
            <TextAreaField
              label="Heading"
              value={settings.home.checkInTitle}
              onChange={(v) => updateSection('home', { checkInTitle: v })}
              rows={2}
              placeholder={DEFAULT_HOME_CHECK_IN.title}
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.checkInDescription}
              onChange={(v) => updateSection('home', { checkInDescription: v })}
              placeholder={DEFAULT_HOME_CHECK_IN.description}
            />
            <Field
              label="Button text"
              value={settings.home.checkInButtonText}
              onChange={(v) => updateSection('home', { checkInButtonText: v })}
              placeholder={DEFAULT_HOME_CHECK_IN.buttonText}
            />
          </SettingsBlock>
          )}

          {homePanel === 'services' && (
          <SettingsBlock
            id="home-services"
            step="Section 8"
            title="Programs heading"
            hint="Badge, title and subtitle above the program cards. Cards still come from Catalog → Services."
            enabled={isHomeSectionEnabled('services')}
            onToggleEnabled={() => toggleHomeSection('services')}
          >
            <Field
              label="Badge"
              value={settings.home.servicesEyebrow}
              onChange={(v) => updateSection('home', { servicesEyebrow: v })}
              placeholder={DEFAULT_HOME_SERVICES.eyebrow}
            />
            <TextAreaField
              label="Heading"
              value={settings.home.servicesTitle}
              onChange={(v) => updateSection('home', { servicesTitle: v })}
              rows={2}
              placeholder={DEFAULT_HOME_SERVICES.title}
            />
            <TextAreaField
              label="Subheading"
              value={settings.home.servicesDescription}
              onChange={(v) => updateSection('home', { servicesDescription: v })}
              placeholder={DEFAULT_HOME_SERVICES.description}
            />
          </SettingsBlock>
          )}

          {homePanel === 'other' && (
          <SettingsBlock
            id="home-other"
            step="Other blocks"
            title="Rest of Home — edited elsewhere"
            hint="These sections appear on Home, but you edit their contents in other admin panels. You can enable or disable them here."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'plans' as HomeSectionId, label: 'Career plans', where: 'Catalog → Plans' },
                { id: 'mentors' as HomeSectionId, label: 'Mentors section', where: 'People → Mentors' },
                { id: 'leadership' as HomeSectionId, label: 'Leadership section', where: 'People → Leadership' },
                { id: 'story' as HomeSectionId, label: 'Brand story teaser', where: 'Site Settings → About' },
                { id: 'cta' as HomeSectionId, label: 'Final Call to Action', where: 'Home page footer banner' },
              ].map(({ id, label, where }) => {
                const on = isHomeSectionEnabled(id);
                return (
                  <div key={id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-page)]">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--admin-text)]">{label}</p>
                      <p className="text-[11px] text-[var(--admin-muted)] mt-0.5">{where}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] font-semibold ${on ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--admin-muted)]'}`}>
                        {on ? 'On' : 'Off'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`Toggle ${label} visibility on Home page`}
                        onClick={() => toggleHomeSection(id)}
                        className={`relative w-10 h-5.5 rounded-full shrink-0 cursor-pointer transition-colors ${
                          on ? 'bg-[#007aff]' : 'bg-[#d1d1d6] dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                            on ? 'translate-x-4.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsBlock>
          )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'About' && (
        <div className="flex flex-col gap-5">
          <Field
            label="Page Title"
            value={settings.about.title}
            onChange={(v) => updateSection('about', { title: v })}
          />
          <TextAreaField
            label="Mission"
            value={settings.about.mission}
            onChange={(v) => updateSection('about', { mission: v })}
          />
          <TextAreaField
            label="Vision"
            value={settings.about.vision}
            onChange={(v) => updateSection('about', { vision: v })}
          />
          <PairListEditor
            label="Values"
            items={settings.about.values}
            keyA="title"
            keyB="description"
            labelA="Title"
            labelB="Description"
            onChange={(items) =>
              updateSection('about', { values: items as any })
            }
          />
          <p className="text-[12px] text-[var(--admin-muted)]">
            Title and Mission are live on the public About page now. Vision
            and Values are saved here for future use.
          </p>
        </div>
      )}

      {subTab === 'Footer' && (
        <div className="flex flex-col gap-5">
          <TextAreaField
            label="Footer Description"
            value={settings.footer.description}
            onChange={(v) => updateSection('footer', { description: v })}
          />
          <Field
            label="Copyright Text"
            value={settings.footer.copyrightText}
            onChange={(v) => updateSection('footer', { copyrightText: v })}
          />
          <PairListEditor
            label="Social Links"
            items={settings.footer.socialLinks}
            keyA="platform"
            keyB="url"
            labelA="Platform (e.g. LinkedIn)"
            labelB="URL"
            onChange={(items) =>
              updateSection('footer', { socialLinks: items as any })
            }
          />
          <p className="text-[12px] text-[var(--admin-muted)]">
            Description and Copyright Text are live in the footer now.
            Social Links are saved here for future use (the footer's icon
            row is still the existing hardcoded set).
          </p>
        </div>
      )}

      {subTab === 'Contact' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Page Title"
              value={settings.contact.title}
              onChange={(v) => updateSection('contact', { title: v })}
            />
            <Field
              label="Phone"
              value={settings.contact.phone}
              onChange={(v) => updateSection('contact', { phone: v })}
            />
            <Field
              label="Email"
              value={settings.contact.email}
              onChange={(v) => updateSection('contact', { email: v })}
              type="email"
            />
            <Field
              label="Map Embed URL"
              value={settings.contact.mapEmbedUrl}
              onChange={(v) => updateSection('contact', { mapEmbedUrl: v })}
            />
          </div>
          <TextAreaField
            label="Description"
            value={settings.contact.description}
            onChange={(v) => updateSection('contact', { description: v })}
          />
          <TextAreaField
            label="Address"
            value={settings.contact.address}
            onChange={(v) => updateSection('contact', { address: v })}
            rows={2}
          />
          <p className="text-[12px] text-[var(--admin-muted)]">
            Address and Email are live on the public Contact page now.
          </p>
        </div>
      )}

      {subTab === 'SEO' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Meta Title"
              value={settings.seo.metaTitle}
              onChange={(v) => updateSection('seo', { metaTitle: v })}
            />
            <Field
              label="OG Image URL"
              value={settings.seo.ogImageUrl}
              onChange={(v) => updateSection('seo', { ogImageUrl: v })}
            />
            <Field
              label="Favicon URL"
              value={settings.seo.faviconUrl}
              onChange={(v) => updateSection('seo', { faviconUrl: v })}
            />
            <Field
              label="Analytics ID"
              value={settings.seo.analyticsId}
              onChange={(v) => updateSection('seo', { analyticsId: v })}
            />
          </div>
          <TextAreaField
            label="Meta Description"
            value={settings.seo.metaDescription}
            onChange={(v) => updateSection('seo', { metaDescription: v })}
          />
          <p className="text-[12px] text-[var(--admin-muted)]">
            Meta Title and Meta Description update the browser tab
            title/description on load (client-side). This is a Vite
            single-page app, so it won't change what search-engine
            crawlers see without a future server-rendering step — flagging
            that honestly rather than overpromising.
          </p>
        </div>
      )}

      {subTab === 'Maintenance' && (
        <div className="flex flex-col gap-5">
          <div
            className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              settings.maintenance.enabled
                ? 'bg-amber-50 border-amber-200'
                : 'bg-[var(--admin-page)] border-[var(--admin-border)]'
            }`}
          >
            <div>
              <p className="text-[14px] font-semibold text-[var(--admin-text)]">Public website</p>
              <p className="text-[12px] text-[var(--admin-muted)] mt-1">
                {settings.maintenance.enabled
                  ? 'Visitors currently see the maintenance page. Team admin at /#admin still works.'
                  : 'Site is live. Turn this on to show a maintenance page to everyone except team admin.'}
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleToggleMaintenance(!settings.maintenance.enabled)}
              className="admin-btn shrink-0"
            >
              {settings.maintenance.enabled ? 'Turn maintenance off' : 'Turn maintenance on'}
            </button>
          </div>

          <Field
            label="Headline"
            value={settings.maintenance.title}
            onChange={(v) => updateSection('maintenance', { title: v })}
          />
          <TextAreaField
            label="Message shown to visitors"
            value={settings.maintenance.message}
            onChange={(v) => updateSection('maintenance', { message: v })}
            rows={4}
          />
          <Field
            label="Expected back (optional)"
            value={settings.maintenance.eta}
            onChange={(v) => updateSection('maintenance', { eta: v })}
          />
          <p className="text-[12px] text-[var(--admin-muted)]">
            Use Save Changes for headline, message, and expected-back text. The on/off switch saves immediately.
            Blank fields keep the default copy on the maintenance page.
          </p>
        </div>
      )}

      {subTab === 'Resources' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-5">
            <Field
              label="Page heading"
              value={settings.resources.heading}
              onChange={(v) => updateSection('resources', { heading: v })}
            />
            <TextAreaField
              label="Page subtitle"
              value={settings.resources.subtitle}
              onChange={(v) => updateSection('resources', { subtitle: v })}
              rows={3}
            />
            <p className="text-[12px] text-[var(--admin-muted)]">
              Heading and subtitle use Save Changes. Articles below save on their own. An empty list means the public Resources page stays empty.
            </p>
          </div>
          <RecordListEditor
            apiBase="/api/resources"
            labelSingular="Playbook"
            fields={RESOURCE_FIELDS}
            emptyRecord={{ title: '', tags: [], visible: true }}
            titleField="title"
            subtitleField="category"
          />
        </div>
      )}
    </div>
  );
};

export default SiteSettingsPanel;
