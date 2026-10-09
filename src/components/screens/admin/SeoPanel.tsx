import React, { useEffect, useState } from 'react';
import { BarChart3, ExternalLink, Globe, RefreshCw, Search } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { useSiteSettings } from '../../../hooks/useSiteSettings';

const PAGE_LABELS: Record<string, string> = {
  home: 'Home',
  'about-us': 'About',
  'how-it-works': 'How it works',
  services: 'Services',
  programmes: 'Programmes',
  webinars: 'Webinars',
  leadership: 'Leadership',
  'leader-profile': 'Leader profile',
  'success-stories': 'Success stories',
  'career-check-in': 'Career check-in',
  mentors: 'Mentors',
  plans: 'Plans',
  resources: 'Resources',
  contact: 'Contact',
  counselling: 'Counselling',
  privacy: 'Privacy',
  terms: 'Terms',
  refund: 'Refund',
};

interface AnalyticsReport {
  today: { views: number; visitors: number };
  last7: { views: number; visitors: number };
  last30: { views: number; visitors: number };
  series: { day: string; views: number; visitors: number }[];
  topPages: { page: string; views: number }[];
  topSources: { source: string; views: number }[];
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#cbdaff] p-5">
      <p className="text-[12px] font-bold text-[#666a76]">{label}</p>
      <p className="text-3xl font-extrabold text-[#061b3b] mt-1">{value}</p>
      <p className="text-[12px] text-[#666a76] mt-1">{hint}</p>
    </div>
  );
}

export const SeoPanel: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { settings } = useSiteSettings();
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/analytics?days=30');
      const data = await res.json();
      if (data.success && data.report) setReport(data.report);
      else setError(data.error || 'Unable to load traffic.');
    } catch {
      setError('Unable to reach the server. Restart npm run dev if this is a new route.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const seo = settings?.seo;
  const checks = [
    { label: 'Meta title', ok: !!seo?.metaTitle?.trim() },
    { label: 'Meta description', ok: !!seo?.metaDescription?.trim() },
    { label: 'Share image', ok: !!seo?.ogImageUrl?.trim() },
    { label: 'Favicon', ok: !!seo?.faviconUrl?.trim() },
    { label: 'Google Analytics ID', ok: !!seo?.analyticsId?.trim() },
  ];
  const maxViews = Math.max(1, ...(report?.series.map((row) => row.views) || [1]));
  const gaId = seo?.analyticsId?.trim() || '';

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#061b3b] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#002869]" />
              SEO & traffic
            </h2>
            <p className="text-xs text-[#666a76] mt-1 max-w-xl">
              Visitors on this website from today onward. Counts start after this panel was added.
              Edit titles and Google Analytics in Site Settings → SEO.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-xl border border-[#cbdaff] text-[#002869] hover:bg-[#f1f3ff] cursor-pointer"
            aria-label="Refresh traffic"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Today" value={report?.today.visitors || 0} hint={`${report?.today.views || 0} page views`} />
          <StatCard label="Last 7 days" value={report?.last7.visitors || 0} hint={`${report?.last7.views || 0} page views`} />
          <StatCard label="Last 30 days" value={report?.last30.visitors || 0} hint={`${report?.last30.views || 0} page views`} />
        </div>

        <div>
          <p className="text-xs font-bold text-[#061b3b] mb-3">Page views (30 days)</p>
          <div className="flex items-end gap-1 h-32">
            {(report?.series || []).map((row) => (
              <div key={row.day} className="flex-1 flex flex-col justify-end h-full group relative">
                <div
                  className="w-full rounded-t bg-[#002869]/80 min-h-[2px]"
                  style={{ height: `${Math.max(4, (row.views / maxViews) * 100)}%` }}
                  title={`${row.day}: ${row.views} views, ${row.visitors} visitors`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#666a76] mt-1">
            <span>{report?.series[0]?.day || ''}</span>
            <span>{report?.series.at(-1)?.day || ''}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-[#cbdaff]">
          <h3 className="text-sm font-bold text-[#061b3b] flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4" />
            Top pages
          </h3>
          {report?.topPages.length ? (
            <div className="flex flex-col divide-y divide-gray-100">
              {report.topPages.map((row) => (
                <div key={row.page} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#061b3b] font-semibold">{PAGE_LABELS[row.page] || row.page}</span>
                  <span className="text-[#666a76]">{row.views}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666a76]">No public visits recorded yet. Open the website to start counting.</p>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#cbdaff]">
          <h3 className="text-sm font-bold text-[#061b3b] mb-3">Traffic sources</h3>
          {report?.topSources.length ? (
            <div className="flex flex-col divide-y divide-gray-100">
              {report.topSources.map((row) => (
                <div key={row.source} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#061b3b] font-semibold">{row.source}</span>
                  <span className="text-[#666a76]">{row.views}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666a76]">No external referrers yet. Direct visits are not listed here.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#061b3b] flex items-center gap-2">
            <Search className="w-4 h-4" />
            SEO setup
          </h3>
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings} className="text-xs font-bold text-[#002869] cursor-pointer">
              Edit in Site Settings
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#f9f9ff] border border-[#e0e8ff] text-xs">
              <span className="text-[#061b3b]">{item.label}</span>
              <span className={item.ok ? 'text-[#006e29] font-bold' : 'text-[#666a76]'}>{item.ok ? 'Set' : 'Missing'}</span>
            </div>
          ))}
        </div>
        {gaId ? (
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#002869]"
          >
            Open Google Analytics ({gaId})
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <p className="text-xs text-[#666a76]">
            Add a GA4 Measurement ID (G-XXXX) in Site Settings → SEO to also send visits to Google Analytics.
          </p>
        )}
      </div>
    </div>
  );
};
