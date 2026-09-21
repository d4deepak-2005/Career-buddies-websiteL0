import React, { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../utils/adminAuth';

// Admin > Candidate Content: notifications, learning materials, master sessions and invoices that
// appear inside a candidate's own Candidate Area. Everything shown to a candidate is typed in here -
// nothing is generated. All calls go through the admin-only /api/admin/candidate-items routes.

type Kind = 'notification' | 'material' | 'session' | 'invoice';

const KINDS: { id: Kind; label: string; single: string; allowAll: boolean }[] = [
  { id: 'notification', label: 'Notifications', single: 'notification', allowAll: true },
  { id: 'material', label: 'Learning Materials', single: 'learning material', allowAll: true },
  { id: 'session', label: 'Master Sessions', single: 'master session', allowAll: false },
  { id: 'invoice', label: 'Invoices', single: 'invoice', allowAll: false },
];

interface CandidateOption { id: string; name: string; email: string }
interface ItemRow {
  id: string; kind: Kind; candidateId: string | null; title: string; description?: string; url?: string; category?: string;
  startsAt?: string; durationMinutes?: number; advisorName?: string; advisorRole?: string; sessionStatus?: string;
  invoiceNo?: string; amount?: number; currency?: string; issuedAt?: string; paymentOrderRef?: string; visible?: boolean; readCount?: number;
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-[#cbdaff] bg-white text-xs text-[#061b3b] focus:outline-none focus:ring-2 focus:ring-[#002869]/30';
const labelCls = 'text-[11px] font-black uppercase tracking-wider text-[#666a76] block mb-1';

// <input type="datetime-local"> works in local time; the API stores an ISO instant.
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyForm = (kind: Kind) => ({
  audience: KINDS.find((k) => k.id === kind)!.allowAll ? 'all' : 'one',
  candidateId: '', title: '', description: '', url: '', category: '',
  startsAt: '', durationMinutes: '', advisorName: '', advisorRole: '', sessionStatus: 'scheduled',
  invoiceNo: '', amount: '', currency: 'INR', issuedAt: '', paymentOrderRef: '', visible: true,
});

export const CandidateContentPanel: React.FC = () => {
  const [kind, setKind] = useState<Kind>('notification');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ReturnType<typeof emptyForm> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const meta = KINDS.find((k) => k.id === kind)!;
  const nameOf = (id: string | null) => {
    if (!id) return 'All candidates';
    const c = candidates.find((x) => x.id === id);
    return c ? `${c.name || 'Candidate'} (${c.email})` : 'Unknown candidate';
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, candRes] = await Promise.all([
        adminFetch(`/api/admin/candidate-items?kind=${kind}`),
        adminFetch('/api/admin/candidate-items/candidates'),
      ]);
      if (!listRes.ok || !candRes.ok) throw new Error('Request failed');
      setItems((await listRes.json()).items || []);
      setCandidates((await candRes.json()).items || []);
    } catch {
      setError('Could not load records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    setForm(null);
    setEditingId(null);
    setNotice('');
    load();
  }, [load]);

  const startEdit = (row: ItemRow) => {
    setEditingId(row.id);
    setFormError('');
    setForm({
      ...emptyForm(kind),
      audience: row.candidateId ? 'one' : 'all',
      candidateId: row.candidateId || '',
      title: row.title || '', description: row.description || '', url: row.url || '', category: row.category || '',
      startsAt: toLocalInput(row.startsAt), durationMinutes: row.durationMinutes != null ? String(row.durationMinutes) : '',
      advisorName: row.advisorName || '', advisorRole: row.advisorRole || '', sessionStatus: row.sessionStatus || 'scheduled',
      invoiceNo: row.invoiceNo || '', amount: row.amount != null ? String(row.amount) : '', currency: row.currency || 'INR',
      issuedAt: toLocalInput(row.issuedAt).slice(0, 10), paymentOrderRef: row.paymentOrderRef || '', visible: row.visible !== false,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError('');
    const payload: any = { ...form, kind };
    if (form.audience === 'all') payload.candidateId = null;
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    try {
      const res = await adminFetch(editingId ? `/api/admin/candidate-items/${editingId}` : '/api/admin/candidate-items', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.error || 'Could not save. Please try again.');
      setForm(null);
      setEditingId(null);
      setNotice(`Saved ${meta.single}.`);
      await load();
    } catch (err: any) {
      setFormError(err.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: ItemRow) => {
    if (!window.confirm(`Delete this ${meta.single}? The candidate will no longer see it.`)) return;
    try {
      const res = await adminFetch(`/api/admin/candidate-items/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      setNotice(`Deleted ${meta.single}.`);
      await load();
    } catch {
      setError('Could not delete. Please try again.');
    }
  };

  const set = (patch: Partial<NonNullable<typeof form>>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#cbdaff] flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-black text-[#061b3b]">Candidate Content</h2>
          <p className="text-xs text-[#434652] mt-1">
            Add records that appear in a candidate's own Candidate Area. Only the candidate you choose can see it
            {kind === 'notification' || kind === 'material' ? ', unless you send it to all candidates' : ''}. Nothing is created automatically.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Record type">
          {KINDS.map((k) => (
            <button
              key={k.id}
              role="tab"
              aria-selected={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                kind === k.id ? 'bg-[#002869] text-white' : 'bg-white text-[#434652] hover:bg-[#e0e8ff] border border-[#e0e8ff]'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {notice && <p role="status" className="text-xs font-bold text-[#00531d] bg-[#79fd8d]/20 rounded-xl px-3 py-2">{notice}</p>}
        {error && <p role="alert" className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        {!form && (
          <div>
            <button
              onClick={() => { setForm(emptyForm(kind)); setEditingId(null); setFormError(''); setNotice(''); }}
              className="px-4 py-2 rounded-xl bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black cursor-pointer"
            >
              Add {meta.single}
            </button>
          </div>
        )}

        {form && (
          <form onSubmit={save} className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="cc-audience">Who can see it</label>
              <div className="flex flex-col sm:flex-row gap-2">
                {meta.allowAll && (
                  <select id="cc-audience" className={inputCls} value={form.audience} onChange={(e) => set({ audience: e.target.value })}>
                    <option value="all">All candidates</option>
                    <option value="one">One candidate</option>
                  </select>
                )}
                {(form.audience === 'one' || !meta.allowAll) && (
                  <select aria-label="Candidate" className={inputCls} value={form.candidateId} onChange={(e) => set({ candidateId: e.target.value })} required>
                    <option value="">Select a candidate…</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || 'Candidate'} — {c.email}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="cc-title">{kind === 'invoice' ? 'Description (what the invoice is for)' : 'Title'}</label>
              <input id="cc-title" className={inputCls} maxLength={200} value={form.title} onChange={(e) => set({ title: e.target.value })} required />
            </div>

            {kind !== 'invoice' && (
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="cc-desc">{kind === 'session' ? 'Agenda' : 'Message / details'}</label>
                <textarea id="cc-desc" className={inputCls} rows={3} maxLength={2000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
              </div>
            )}

            {kind === 'material' && (
              <div>
                <label className={labelCls} htmlFor="cc-cat">Category (optional)</label>
                <input id="cc-cat" className={inputCls} maxLength={100} value={form.category} onChange={(e) => set({ category: e.target.value })} />
              </div>
            )}

            {kind === 'session' && (
              <>
                <div>
                  <label className={labelCls} htmlFor="cc-start">Date and time</label>
                  <input id="cc-start" type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} required />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-dur">Duration (minutes, optional)</label>
                  <input id="cc-dur" type="number" min={0} max={1440} className={inputCls} value={form.durationMinutes} onChange={(e) => set({ durationMinutes: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-adv">Advisor / mentor name (optional)</label>
                  <input id="cc-adv" className={inputCls} maxLength={200} value={form.advisorName} onChange={(e) => set({ advisorName: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-role">Advisor role (optional)</label>
                  <input id="cc-role" className={inputCls} maxLength={200} value={form.advisorRole} onChange={(e) => set({ advisorRole: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-status">Status</label>
                  <select id="cc-status" className={inputCls} value={form.sessionStatus} onChange={(e) => set({ sessionStatus: e.target.value })}>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </>
            )}

            {kind === 'invoice' && (
              <>
                <div>
                  <label className={labelCls} htmlFor="cc-no">Invoice number</label>
                  <input id="cc-no" className={inputCls} maxLength={60} value={form.invoiceNo} onChange={(e) => set({ invoiceNo: e.target.value })} required />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-amt">Amount (as printed on the invoice)</label>
                  <input id="cc-amt" type="number" min={0} step="0.01" className={inputCls} value={form.amount} onChange={(e) => set({ amount: e.target.value })} required />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-cur">Currency</label>
                  <input id="cc-cur" className={inputCls} maxLength={8} value={form.currency} onChange={(e) => set({ currency: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-issued">Issue date</label>
                  <input id="cc-issued" type="date" className={inputCls} value={form.issuedAt} onChange={(e) => set({ issuedAt: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="cc-pay">Payment reference (optional, must be this candidate's own payment)</label>
                  <input id="cc-pay" className={inputCls} maxLength={60} value={form.paymentOrderRef} onChange={(e) => set({ paymentOrderRef: e.target.value })} />
                </div>
              </>
            )}

            {kind !== 'notification' && (
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="cc-url">
                  {kind === 'material' ? 'Link to the material (https://…)' : kind === 'session' ? 'Meeting link (paste the real link, optional)' : 'Link to the invoice document (optional)'}
                </label>
                <input id="cc-url" type="url" className={inputCls} maxLength={1000} value={form.url} onChange={(e) => set({ url: e.target.value })} required={kind === 'material'} placeholder="https://" />
              </div>
            )}

            <label className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-[#434652]">
              <input type="checkbox" checked={form.visible} onChange={(e) => set({ visible: e.target.checked })} />
              Visible to the candidate
            </label>

            {formError && <p role="alert" className="sm:col-span-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>}

            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black cursor-pointer disabled:opacity-60">
                {saving ? 'Saving…' : editingId ? 'Save changes' : `Add ${meta.single}`}
              </button>
              <button type="button" onClick={() => { setForm(null); setEditingId(null); }} className="px-5 py-2 rounded-xl bg-white border border-[#cbdaff] text-[#002869] text-xs font-bold cursor-pointer">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#cbdaff]">
        {loading ? (
          <p className="text-xs text-[#666a76]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-[#666a76]">No {meta.label.toLowerCase()} added yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((row) => (
              <li key={row.id} className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#061b3b] break-words">
                    {row.title}
                    {row.visible === false && <span className="ml-2 text-[11px] font-black text-[#666a76]">(hidden)</span>}
                  </p>
                  <p className="text-[11px] text-[#666a76] mt-0.5 break-words">
                    For: {nameOf(row.candidateId)}
                    {row.kind === 'invoice' && row.invoiceNo ? ` • ${row.invoiceNo}` : ''}
                    {row.kind === 'session' && row.startsAt ? ` • ${new Date(row.startsAt).toLocaleString('en-IN')}` : ''}
                    {row.kind === 'notification' ? ` • read by ${row.readCount ?? 0}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(row)} className="px-3 py-1.5 rounded-lg bg-white border border-[#cbdaff] text-[#002869] text-xs font-bold cursor-pointer">Edit</button>
                  <button onClick={() => remove(row)} className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-bold cursor-pointer">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
