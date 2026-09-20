import React, { useEffect, useId, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { SiteSettingsData } from '../../../hooks/useSiteSettings';

const EMPTY_SETTINGS: SiteSettingsData = {
  general: {
    brandName: '',
    primaryColor: '',
    secondaryColor: '',
    whatsappNumber: '',
    supportEmail: '',
    phone: '',
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
};

const SUB_TABS = [
  'General',
  'Header',
  'Home',
  'About',
  'Footer',
  'Contact',
  'SEO',
] as const;

type SubTab = (typeof SUB_TABS)[number];

const inputClass =
  'w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]';
const labelClass = 'block text-xs font-bold text-[#061b3b] mb-1';

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const fid = useId();
  return (
    <div>
      <label htmlFor={fid} className={labelClass}>{label}</label>
      <input id={fid}
        type={type}
        value={value}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const fid = useId();
  return (
    <div>
      <label htmlFor={fid} className={labelClass}>{label}</label>
      <textarea id={fid}
        rows={rows}
        value={value}
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
          className="flex items-center gap-1 text-[11px] font-bold text-[#002869] hover:text-[#0b3d91] cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="text-[11px] text-[#666a76]">No entries yet.</p>
        )}
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              aria-label={`${label}: ${labelA}`}
              placeholder={labelA}
              value={item[keyA] || ''}
              onChange={(e) => update(index, keyA, e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              aria-label={`${label}: ${labelB}`}
              placeholder={labelB}
              value={item[keyB] || ''}
              onChange={(e) => update(index, keyB, e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"
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

export const SiteSettingsPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('General');
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
          setSettings({ ...EMPTY_SETTINGS, ...data.settings });
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

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await adminFetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings({ ...EMPTY_SETTINGS, ...data.settings });
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

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-[#cbdaff] shadow-xs text-xs text-[#666a76]">
        Loading Site Settings...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#061b3b]">Site Settings</h2>
          <p className="text-xs text-[#666a76]">
            Edit content here and it appears live on the public website —
            no code changes needed. Sections left blank keep showing the
            site's existing content.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#79fd8d]/30 text-[#00531d] text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved successfully!</span>
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{saveError}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab strip */}
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
          <label className="flex items-center gap-2 text-xs font-bold text-[#061b3b] cursor-pointer w-fit">
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
          <p className="text-[11px] text-[#666a76] -mt-2">
            Logo is live on the public site now. Navigation labels/links,
            CTA and the announcement bar are saved here but not yet shown
            publicly — a later phase wires them in without changing this
            form.
          </p>
        </div>
      )}

      {subTab === 'Home' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Hero Badge / Subtitle"
              value={settings.home.heroSubtitle}
              onChange={(v) => updateSection('home', { heroSubtitle: v })}
            />
            <Field
              label="Hero CTA Text"
              value={settings.home.heroCtaText}
              onChange={(v) => updateSection('home', { heroCtaText: v })}
            />
          </div>
          <TextAreaField
            label="Hero Title"
            value={settings.home.heroTitle}
            onChange={(v) => updateSection('home', { heroTitle: v })}
            rows={2}
          />
          <TextAreaField
            label="Hero Description"
            value={settings.home.heroDescription}
            onChange={(v) => updateSection('home', { heroDescription: v })}
          />
          <Field
            label="Hero Image URL"
            value={settings.home.heroImageUrl}
            onChange={(v) => updateSection('home', { heroImageUrl: v })}
          />
          <PairListEditor
            label="Statistics"
            items={settings.home.stats}
            keyA="label"
            keyB="value"
            labelA="Label (e.g. Professionals Guided)"
            labelB="Value (e.g. 5000+)"
            onChange={(items) =>
              updateSection('home', { stats: items as any })
            }
          />
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
          <p className="text-[11px] text-[#666a76]">
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
          <p className="text-[11px] text-[#666a76]">
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
          <p className="text-[11px] text-[#666a76]">
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
          <p className="text-[11px] text-[#666a76]">
            Meta Title and Meta Description update the browser tab
            title/description on load (client-side). This is a Vite
            single-page app, so it won't change what search-engine
            crawlers see without a future server-rendering step — flagging
            that honestly rather than overpromising.
          </p>
        </div>
      )}
    </div>
  );
};

export default SiteSettingsPanel;
