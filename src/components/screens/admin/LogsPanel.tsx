import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ScrollText, Search } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { Skeleton } from '../../common/Skeleton';

interface AdminLogRow {
  id: string;
  actorName: string;
  actorSource: 'owner' | 'team';
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'Webinar', label: 'Webinars' },
  { id: 'Programme', label: 'Programmes' },
  { id: 'Plan', label: 'Plans' },
  { id: 'Service', label: 'Services' },
  { id: 'Person', label: 'People' },
  { id: 'Mentor', label: 'Mentors' },
  { id: 'Resource', label: 'Resources' },
  { id: 'Testimonial', label: 'Stories' },
  { id: 'settings', label: 'Settings' },
  { id: 'lead', label: 'Leads' },
  { id: 'team', label: 'Team' },
  { id: 'media', label: 'Media' },
  { id: 'candidate-item', label: 'Candidate content' },
  { id: 'session', label: 'Sign-in' },
  { id: 'mail', label: 'Mail' },
];

function formatWhen(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function actionTone(action: string) {
  if (action === 'create' || action === 'login') return 'admin-tone-ok';
  if (action === 'delete') return 'admin-tone-bad';
  if (action === 'status') return 'admin-tone-warn';
  return 'admin-tone-info';
}

export const LogsPanel: React.FC = () => {
  const [items, setItems] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (entity !== 'all') params.set('entity', entity);
      params.set('limit', '300');
      const res = await adminFetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not load logs.');
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Could not load logs.');
    } finally {
      setLoading(false);
    }
  }, [search, entity]);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(load, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const shown = useMemo(() => items, [items]);

  return (
    <div className="bg-white rounded-3xl border border-[#cbdaff] shadow-xs flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-[#cbdaff] flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#061b3b] flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-[#002869]" />
              Activity logs
            </h2>
            <p className="text-xs text-[#666a76] mt-1">Who changed what, and when. Passwords are never stored here.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="admin-btn"
            aria-label="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#666a76] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or change"
              className="w-full pl-8 pr-3"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setEntity(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                entity === f.id
                  ? 'bg-[#002869] text-white border-[#002869]'
                  : 'bg-[#f9f9ff] text-[#434652] border-[#cbdaff]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">{error}</div>
      )}

      {loading ? (
        <div className="p-6 flex flex-col gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : shown.length === 0 ? (
        <p className="p-10 text-center text-sm text-[#666a76]">No activity recorded yet. Changes made in admin will show up here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f1f3ff] text-[#666a76]">
              <tr>
                <th className="px-5 py-3 font-bold">When</th>
                <th className="px-5 py-3 font-bold">Who</th>
                <th className="px-5 py-3 font-bold">Action</th>
                <th className="px-5 py-3 font-bold">What</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1fb]">
              {shown.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-5 py-3 text-[#434652] whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                  <td className="px-5 py-3">
                    <p className="font-black text-[#061b3b]">{row.actorName}</p>
                    <p className="text-[10px] text-[#666a76] uppercase tracking-wide">{row.actorSource === 'team' ? 'Team' : 'Owner'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${actionTone(row.action)}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-bold text-[#061b3b]">{row.summary}</p>
                    {row.details && (
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === row.id ? null : row.id)}
                        className="mt-1 text-[11px] font-bold text-[#002869] cursor-pointer"
                      >
                        {openId === row.id ? 'Hide details' : 'Show details'}
                      </button>
                    )}
                    {openId === row.id && row.details && (
                      <pre className="mt-2 p-2.5 rounded-xl bg-[#f9f9ff] border border-[#e0e8ff] text-[10px] text-[#434652] overflow-x-auto">
                        {JSON.stringify(row.details, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
