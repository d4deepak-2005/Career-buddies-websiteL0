import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, RefreshCw, Search, UserCircle2 } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { Skeleton, TableSkeleton } from '../../common/Skeleton';
import { downloadExcel, inDateRange, stampFileDate } from '../../../utils/excelExport';
import { DateRange, ExportExcelDialog } from './ExportExcelDialog';

interface AccountRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  accountType: string;
  emailVerified: boolean;
  hasPassword: boolean;
  providers: string[];
  currentDesignation: string;
  totalExperience: string;
  targetRole: string;
  joinedAt: string;
  paymentCount: number;
  paidCount: number;
  enquiryCount: number;
}

interface PaymentRow {
  orderRef: string;
  itemType: string;
  itemName: string;
  status: string;
  amount: number | null;
  currency: string;
  createdAt: string;
}

interface EnquiryRow {
  id: string;
  createdAt: string;
  source: string;
  status: string;
  requirement: string;
  planInterest: string;
}

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

function formatMoney(amount: number | null, currency: string) {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function signInLabel(row: AccountRow) {
  const parts: string[] = [];
  if (row.hasPassword) parts.push('Password');
  if (row.providers?.length) parts.push(...row.providers.map((p) => p.charAt(0).toUpperCase() + p.slice(1)));
  return parts.length ? parts.join(', ') : '—';
}

export const UsersPanel: React.FC = () => {
  const [items, setItems] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    candidate: AccountRow;
    payments: PaymentRow[];
    enquiries: EnquiryRow[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/candidates');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not load users.');
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Could not reach the server.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await adminFetch(`/api/admin/candidates/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setDetailError(data.error || 'Could not load this user.');
        return;
      }
      setDetail({
        candidate: { ...data.candidate, paymentCount: 0, paidCount: 0, enquiryCount: 0 },
        payments: data.payments || [],
        enquiries: data.enquiries || [],
      });
    } catch {
      setDetailError('Could not reach the server.');
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((u) => {
      if (typeFilter !== 'all' && u.accountType !== typeFilter) return false;
      if (!q) return true;
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.mobile || '').includes(q)
      );
    });
  }, [items, search, typeFilter]);

  const usersForExport = (range: DateRange) =>
    filtered.filter((u) => inDateRange(u.joinedAt, range.from, range.to));

  const exportExcel = (range: DateRange) => {
    const rows = usersForExport(range);
    if (rows.length === 0) return;
    downloadExcel(
      `careerbuddies-users-${stampFileDate()}`,
      'Users',
      [
        'Name',
        'Email',
        'Mobile',
        'Type',
        'Sign-in',
        'Email verified',
        'Designation',
        'Experience',
        'Target role',
        'Joined',
        'Payments',
        'Paid',
        'Enquiries',
      ],
      rows.map((u) => [
        `${u.firstName} ${u.lastName}`.trim(),
        u.email,
        u.mobile || '',
        u.accountType,
        signInLabel(u),
        u.emailVerified ? 'Yes' : 'No',
        u.currentDesignation || '',
        u.totalExperience || '',
        u.targetRole || '',
        formatWhen(u.joinedAt),
        u.paymentCount || 0,
        u.paidCount || 0,
        u.enquiryCount || 0,
      ])
    );
    setExportOpen(false);
  };

  if (selectedId) {
    const c = detail?.candidate;
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetail(null);
              setDetailError(null);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#002869] hover:text-[#0b3d91] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to users
          </button>
        </div>

        {detailError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl">{detailError}</div>
        )}
        {detailLoading && (
          <div className="flex flex-col gap-2 py-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {c && (
          <>
            <div>
              <h2 className="text-lg font-bold text-[#061b3b]">
                {`${c.firstName} ${c.lastName}`.trim() || 'User'}
              </h2>
              <p className="text-xs text-[#666a76] mt-1">
                {c.email}
                {c.mobile ? ` · ${c.mobile}` : ''} · {c.accountType} · joined {formatWhen(c.joinedAt)}
              </p>
              {(c.currentDesignation || c.targetRole) && (
                <p className="text-xs text-[#434652] mt-1">
                  {[c.currentDesignation, c.totalExperience, c.targetRole].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#002869] mb-2">Payments</h3>
              {detail!.payments.length === 0 ? (
                <p className="text-xs text-[#666a76]">No payments on this account.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-[#f9f9ff] text-[#666a76] font-bold">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Order</th>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail!.payments.map((p) => (
                        <tr key={p.orderRef}>
                          <td className="p-2.5 text-[#666a76] whitespace-nowrap">{formatWhen(p.createdAt)}</td>
                          <td className="p-2.5 font-mono text-[#002869] font-bold">{p.orderRef}</td>
                          <td className="p-2.5">{p.itemName}</td>
                          <td className="p-2.5 font-bold">{formatMoney(p.amount, p.currency)}</td>
                          <td className="p-2.5 capitalize">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#002869] mb-2">Enquiries</h3>
              {detail!.enquiries.length === 0 ? (
                <p className="text-xs text-[#666a76]">No enquiries linked to this account (form leads without login stay in Leads only).</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {detail!.enquiries.map((e) => (
                    <div key={e.id} className="p-3 rounded-xl border border-[#cbdaff] bg-[#f9f9ff]">
                      <div className="flex justify-between gap-2 text-[11px] text-[#666a76]">
                        <span>{e.source} · {e.status}</span>
                        <span>{formatWhen(e.createdAt)}</span>
                      </div>
                      <p className="text-xs text-[#061b3b] mt-1 font-semibold">{e.planInterest}</p>
                      <p className="text-xs text-[#434652] mt-0.5">{e.requirement}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[#cbdaff] pb-5">
        <div>
          <h2 className="text-lg font-bold text-[#061b3b] flex items-center gap-2">
            <UserCircle2 className="w-5 h-5 text-[#002869]" />
            Registered users
          </h2>
          <p className="text-xs text-[#666a76] mt-1 max-w-xl">
            People who created a Candidate Area account (Login / Sign Up). Form-only enquiries stay in Leads.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-[#f1f3ff] text-[#002869] border border-[#cbdaff] text-[11px] font-bold w-fit">
          {items.length} accounts
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#666a76] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            aria-label="Search users"
            type="text"
            placeholder="Name, email, or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter by account type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3"
          >
            <option value="all">All types</option>
            <option value="mentee">Mentee</option>
            <option value="mentor">Mentor</option>
          </select>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            disabled={filtered.length === 0}
            className="admin-btn"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="admin-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[780px]">
          <thead>
            <tr className="border-b border-gray-200 bg-[#f9f9ff] text-[#666a76] font-bold">
              <th className="p-3">User</th>
              <th className="p-3">Type</th>
              <th className="p-3">Sign-in</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Payments</th>
              <th className="p-3">Enquiries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="hover:bg-[#f9f9ff] transition-colors cursor-pointer"
                onClick={() => openDetail(u.id)}
              >
                <td className="p-3">
                  <strong className="text-[#061b3b] block">{`${u.firstName} ${u.lastName}`.trim() || '—'}</strong>
                  <span className="text-[#666a76] text-[11px] block">{u.email}</span>
                  {u.mobile && <span className="text-[#006e29] text-[11px] font-mono">{u.mobile}</span>}
                </td>
                <td className="p-3 capitalize font-semibold">{u.accountType}</td>
                <td className="p-3 text-[#434652]">{signInLabel(u)}</td>
                <td className="p-3 text-[#666a76] whitespace-nowrap">{formatWhen(u.joinedAt)}</td>
                <td className="p-3">
                  {u.paidCount > 0 ? (
                    <span className="font-bold text-[#00531d]">{u.paidCount} paid</span>
                  ) : (
                    <span className="text-[#666a76]">{u.paymentCount || 0}</span>
                  )}
                </td>
                <td className="p-3 text-[#666a76]">{u.enquiryCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && !error && (
          <p className="text-center text-sm text-[#666a76] py-10">
            {items.length === 0 ? 'No registered users yet.' : 'No users match your filters.'}
          </p>
        )}
        {loading && items.length === 0 && <TableSkeleton rows={6} />}
      </div>

      <ExportExcelDialog
        isOpen={exportOpen}
        title="Export users"
        description="Only Users tab rows. Choose a date range, then download an Excel file."
        matchCount={(range) => usersForExport(range).length}
        onClose={() => setExportOpen(false)}
        onExport={exportExcel}
      />
    </div>
  );
};
