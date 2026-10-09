import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Code2, Eye } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { HOME_SECTIONS, HomeSectionId, defaultHomeHtml, HomeHtmlBlock } from '../../../config/homeSections';
import { DEFAULT_HOME_SECTION_HTML } from '../../../config/homeHtmlDefaults';
import { SiteSettingsData } from '../../../hooks/useSiteSettings';
import { CardGridSkeleton } from '../../common/Skeleton';

function mergeHtml(raw: unknown): Record<HomeSectionId, HomeHtmlBlock> {
  const base = defaultHomeHtml();
  const saved = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, HomeHtmlBlock>) : {};
  for (const section of HOME_SECTIONS) {
    const row = saved[section.id];
    const savedHtml = typeof row?.html === 'string' ? row.html : '';
    base[section.id] = {
      enabled: !!row?.enabled,
      html: savedHtml.trim() ? savedHtml : DEFAULT_HOME_SECTION_HTML[section.id],
    };
  }
  return base;
}

export function HomeHtmlPanel() {
  const [home, setHome] = useState<SiteSettingsData['home'] | null>(null);
  const [blocks, setBlocks] = useState(defaultHomeHtml());
  const [selectedId, setSelectedId] = useState<HomeSectionId | ''>('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminFetch('/api/site-settings')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.settings?.home) return;
        setHome(data.settings.home);
        setBlocks(mergeHtml(data.settings.home.homeHtml));
      })
      .catch(() => {
        if (!cancelled) setSaveError('Unable to load settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (id: HomeSectionId, patch: Partial<HomeHtmlBlock>) => {
    setBlocks((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = async () => {
    if (!home) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await adminFetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home: { ...home, homeHtml: blocks } }),
      });
      const data = await res.json();
      if (data.success && data.settings?.home) {
        setHome(data.settings.home);
        setBlocks(mergeHtml(data.settings.home.homeHtml));
        setSaveSuccess(true);
        window.setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        setSaveError(data.error || 'Unable to save HTML.');
      }
    } catch {
      setSaveError('Unable to save HTML.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CardGridSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#061b3b]">Home HTML</h2>
          <p className="text-[13px] text-[#666a76] max-w-2xl">
            Each section starts with the current layout as HTML and inline CSS. Edit it, then turn
            <span className="font-bold"> Use HTML</span> on to replace that section on Home. Leave the switch off and
            the live section stays as it is.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !home}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007aff] text-white text-[13px] font-bold disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save HTML'}
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 text-[13px] text-[#006226]">
          <CheckCircle2 className="w-4 h-4" />
          Saved. Refresh Home to see it.
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 text-[13px] text-[#8a1f1f]">
          <AlertCircle className="w-4 h-4" />
          {saveError}
        </div>
      )}

      <div className="rounded-2xl border border-[#cbdaff] bg-white p-4">
        <label className="block text-[12px] font-bold text-[#061b3b] mb-1.5" htmlFor="home-html-section">
          Section
        </label>
        <select
          id="home-html-section"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value as HomeSectionId | '');
            setPreview(false);
          }}
          className="w-full max-w-md px-3"
        >
          <option value="">Select a section</option>
          {HOME_SECTIONS.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
              {blocks[section.id]?.enabled ? ' (HTML on)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedId && (
        <div className="rounded-2xl border border-[#cbdaff] bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#eef2ff]">
            <div>
              <p className="text-[14px] font-bold text-[#061b3b]">
                {HOME_SECTIONS.find((section) => section.id === selectedId)?.label}
              </p>
              <p className="text-[11px] text-[#666a76]">
                {blocks[selectedId].enabled
                  ? 'HTML is on — this replaces the normal section'
                  : 'HTML is off — normal section'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={blocks[selectedId].enabled}
              aria-label={`${blocks[selectedId].enabled ? 'Disable' : 'Enable'} HTML for this section`}
              onClick={() => update(selectedId, { enabled: !blocks[selectedId].enabled })}
              className={`relative w-11 h-6 rounded-full shrink-0 cursor-pointer transition-colors ${
                blocks[selectedId].enabled ? 'bg-[#007aff]' : 'bg-[#d1d1d6]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  blocks[selectedId].enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#061b3b]">HTML</span>
              <button
                type="button"
                onClick={() => setPreview((value) => !value)}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#007aff]"
              >
                {preview ? <Code2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {preview ? 'Edit HTML' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div
                className="min-h-[280px] rounded-xl border border-[#cbdaff] bg-[#f9f9ff] p-4 overflow-auto"
                dangerouslySetInnerHTML={{
                  __html: blocks[selectedId].html || '<p style="color:#666a76;font-size:13px;">Nothing to preview.</p>',
                }}
              />
            ) : (
              <textarea
                aria-label="Section HTML"
                spellCheck={false}
                rows={18}
                value={blocks[selectedId].html}
                onChange={(e) => update(selectedId, { html: e.target.value })}
                className="w-full min-h-[280px] rounded-xl border border-[#cbdaff] bg-[#f9f9ff] px-3 py-2 text-[13px] font-mono text-[#061b3b] outline-none focus:border-[#007aff]"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
