import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, CreditCard, Download, Mail, Phone, RefreshCw, Search, X } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { TableSkeleton } from '../../common/Skeleton';
import { ModalA11y } from '../../common/ModalA11y';
import { downloadExcel, inDateRange, stampFileDate } from '../../../utils/excelExport';
import { DateRange, ExportExcelDialog } from './ExportExcelDialog';

export interface AdminPaymentRecord {
  _id?: string;
  orderRef: string;
  itemType: string;
  itemName: string;
  status: string;
  expectedAmount?: number;
  expectedCurrency?: string;
  baseAmount?: number;
  gstAmount?: number;
  gstRate?: number;
  amount?: number;
  currency?: string;
  amountMismatch?: boolean;
  candidateId?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  details?: Record<string, unknown>;
  failureReason?: string;
  dodoPaymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  itemId?: string;
  provider?: string;
  lastEventType?: string;
  lastEventAt?: string;
  createdAt?: string;
}

const STATUS_LABEL: Record<string, string> = {
  succeeded: 'Paid',
  created: 'Pending',
  processing: 'Processing',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const statusTone = (status: string) => {
  if (status === 'succeeded') return 'bg-[#79fd8d]/30 text-[#00531d]';
  if (status === 'failed' || status === 'cancelled') return 'bg-red-50 text-red-800';
  if (status === 'expired') return 'bg-amber-50 text-amber-900';
  return 'bg-[#dae2ff]/60 text-[#002869]';
};

function minorToMajor(minor: number | undefined, paid: boolean, record: AdminPaymentRecord): number | null {
  const raw = paid && record.amount != null ? record.amount : record.expectedAmount ?? record.amount;
  if (typeof raw !== 'number') return null;
  return raw / 100;
}

function formatMoney(amount: number | null, currency: string) {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
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

function formatDetailValue(value: unknown): string {
  if (value == null) return '—';
  if (Array.isArray(value)) return value.map((v) => formatDetailValue(v)).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function initials(name?: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '—';
}

function extraDetails(details?: Record<string, unknown>) {
  return Object.entries(details || {}).filter(([, value]) => value != null && String(value).trim() !== '');
}

const PaymentDetailModal: React.FC<{ payment: AdminPaymentRecord; onClose: () => void }> = ({ payment, onClose }) => {
  const paid = payment.status === 'succeeded';
  const currency = (paid && payment.currency) || payment.expectedCurrency || payment.currency || 'INR';
  const total = minorToMajor(undefined, paid, payment);
  const base = typeof payment.baseAmount === 'number' ? payment.baseAmount / 100 : null;
  const gst = typeof payment.gstAmount === 'number' ? payment.gstAmount / 100 : null;
  const extras = extraDetails(payment.details);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-md" aria-label="Close payment details" onClick={onClose} />
      <ModalA11y label="Payment details" onClose={onClose} />
      <div className="relative w-full sm:max-w-[540px] max-h-[92vh] bg-[var(--admin-sidebar)] border border-[var(--admin-border)] sm:rounded-[28px] rounded-t-[28px] shadow-[0_28px_80px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col">
        <div className="relative px-6 pt-6 pb-6 bg-[var(--admin-soft)]">
          <div className="flex items-start justify-between gap-3">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusTone(payment.status)}`}>
              {STATUS_LABEL[payment.status] || payment.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--admin-page)] border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-5 text-[12px] uppercase tracking-[0.16em] text-[var(--admin-muted)]">{paid ? 'Paid' : 'Amount'}</p>
          <p className="mt-1 text-[34px] leading-none font-semibold tracking-tight text-[var(--admin-text)]">
            {formatMoney(total, currency)}
          </p>
          <p className="mt-2 text-[14px] text-[var(--admin-text)] truncate">{payment.itemName || 'Untitled item'}</p>
          <p className="text-[12px] text-[var(--admin-muted)] capitalize">
            {[payment.itemType, formatWhen(payment.createdAt)].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <section className="rounded-2xl border border-[var(--admin-border)] p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--admin-soft)] text-[var(--admin-text)] text-[13px] font-semibold flex items-center justify-center shrink-0">
              {initials(payment.customerName)}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[var(--admin-text)] truncate">{payment.customerName || 'No name'}</p>
              <p className="text-[12px] text-[var(--admin-muted)] truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3 h-3 shrink-0" />
                {payment.customerEmail || '—'}
              </p>
              {payment.customerMobile ? (
                <p className="text-[12px] text-[var(--admin-muted)] truncate flex items-center gap-1.5">
                  <Phone className="w-3 h-3 shrink-0" />
                  {payment.customerMobile}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--admin-border)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)] mb-3">Breakdown</p>
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <span className="text-[var(--admin-muted)]">Base</span>
                <span className="text-[var(--admin-text)]">{formatMoney(base, currency)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--admin-muted)]">GST{payment.gstRate ? ` (${payment.gstRate}%)` : ''}</span>
                <span className="text-[var(--admin-text)]">{formatMoney(gst, currency)}</span>
              </div>
              <div className="flex justify-between gap-3 pt-2 mt-1 border-t border-[var(--admin-border)] text-[14px] font-semibold">
                <span className="text-[var(--admin-text)]">Total</span>
                <span className="text-[var(--admin-text)]">{formatMoney(total, currency)}</span>
              </div>
            </div>
            {payment.amountMismatch && (
              <p className="mt-3 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Amount flagged for review
              </p>
            )}
            {payment.failureReason && (
              <p className="mt-3 text-[12px] text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {payment.failureReason}
              </p>
            )}
          </section>

          {extras.length > 0 && (
            <section className="rounded-2xl border border-[var(--admin-border)] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)] mb-3">Checkout details</p>
              <div className="flex flex-col gap-3">
                {extras.map(([key, value]) => (
                  <div key={key}>
                    <p className="text-[11px] text-[var(--admin-muted)] capitalize">{key}</p>
                    <p className="text-[13px] text-[var(--admin-text)] whitespace-pre-wrap break-words mt-0.5">{formatDetailValue(value)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl bg-[var(--admin-soft)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-[var(--admin-muted)]">Order ref</p>
              <p className="text-[12px] font-mono text-[var(--admin-text)] break-all mt-0.5">{payment.orderRef}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--admin-muted)]">Account</p>
              <p className="text-[12px] font-mono text-[var(--admin-text)] break-all mt-0.5">{payment.candidateId ? String(payment.candidateId) : '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--admin-muted)]">Razorpay order</p>
              <p className="text-[12px] font-mono text-[var(--admin-text)] break-all mt-0.5">{payment.razorpayOrderId || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--admin-muted)]">Razorpay payment</p>
              <p className="text-[12px] font-mono text-[var(--admin-text)] break-all mt-0.5">{payment.razorpayPaymentId || '—'}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// ---- Status change dialog: click a payment's status badge to mark it as paid ------------
// For money that arrived outside the online flow (UPI / bank transfer / cash). Writes
// details.manualPayment on the row and an admin audit log entry.

const PAY_METHODS = [
  { id: 'upi', label: 'UPI' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'cash', label: 'Cash' },
  { id: 'other', label: 'Other' },
];

const StatusChangeModal: React.FC<{
  payment: AdminPaymentRecord;
  onClose: () => void;
  onMarked: () => void;
}> = ({ payment, onClose, onMarked }) => {
  const paid = payment.status === 'succeeded';
  const manual = (payment.details as any)?.manualPayment as
    | { by?: string; method?: string; note?: string; at?: string }
    | undefined;
  const [amount, setAmount] = useState(() => {
    const minor = payment.expectedAmount ?? payment.amount;
    return typeof minor === 'number' ? String(minor / 100) : '';
  });
  const [method, setMethod] = useState('upi');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await adminFetch(`/api/admin/payments/${payment.orderRef}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.error || 'Could not mark as paid.');
      onMarked();
    } catch (err: any) {
      setError(err.message || 'Could not mark as paid.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-md" aria-label="Close status dialog" onClick={onClose} />
      <ModalA11y label="Change payment status" onClose={onClose} />
      <div className="relative w-full sm:max-w-[440px] max-h-[92vh] bg-[var(--admin-sidebar)] border border-[var(--admin-border)] sm:rounded-[28px] rounded-t-[28px] shadow-[0_28px_80px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col">
        <div className="relative px-6 pt-6 pb-6 bg-[var(--admin-soft)]">
          <div className="flex items-start justify-between gap-3">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusTone(payment.status)}`}>
              {STATUS_LABEL[payment.status] || payment.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--admin-page)] border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-5 text-[12px] uppercase tracking-[0.16em] text-[var(--admin-muted)]">{paid ? 'Paid' : 'Amount'}</p>
          <p className="mt-1 text-[30px] leading-none font-semibold tracking-tight text-[var(--admin-text)]">
            {formatMoney(minorToMajor(undefined, paid, payment), (paid && payment.currency) || payment.expectedCurrency || payment.currency || 'INR')}
          </p>
          <p className="mt-2 text-[14px] text-[var(--admin-text)] truncate">{payment.itemName || 'Untitled item'}</p>
          <p className="text-[12px] text-[var(--admin-muted)] truncate">
            {[payment.customerName, payment.customerEmail].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {paid ? (
            <div className="rounded-2xl border border-[var(--admin-border)] p-4">
              <p className="text-[13px] text-[var(--admin-text)]">
                This payment is already <strong>Paid</strong>.
              </p>
              {manual && (
                <p className="mt-2 text-[12px] text-[var(--admin-muted)]">
                  Marked manually{manual.by ? ` by ${manual.by}` : ''}
                  {manual.method ? ` (${PAY_METHODS.find((m) => m.id === manual.method)?.label || manual.method})` : ''}
                  {manual.at ? ` on ${formatWhen(manual.at)}` : ''}.
                  {manual.note ? ` Note: ${manual.note}` : ''}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <p className="text-[12px] text-[var(--admin-muted)]">
                Use this when the candidate paid outside the website (UPI, bank transfer, cash). Marking it paid puts the
                item on their dashboard.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)] block mb-1" htmlFor="st-amount">Amount paid (₹)</label>
                  <input
                    id="st-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)] block mb-1" htmlFor="st-method">How they paid</label>
                  <select id="st-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAY_METHODS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)] block mb-1" htmlFor="st-note">Note (optional — UPI id, transaction ref…)</label>
                <input id="st-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              {error && <p role="alert" className="text-[12px] font-semibold text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="admin-btn admin-btn-primary">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {saving ? 'Marking…' : 'Mark as paid'}
                </button>
                <button type="button" onClick={onClose} className="admin-btn">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const PaymentsPanel: React.FC = () => {
  const [items, setItems] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [openPayment, setOpenPayment] = useState<AdminPaymentRecord | null>(null);
  const [statusPayment, setStatusPayment] = useState<AdminPaymentRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/api/payments/admin');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not load payments.');
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((p) => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      return (
        p.orderRef.toLowerCase().includes(q) ||
        (p.customerEmail || '').toLowerCase().includes(q) ||
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.itemName || '').toLowerCase().includes(q) ||
        (p.customerMobile || '').includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const succeededCount = items.filter((p) => p.status === 'succeeded').length;
  const mismatchCount = items.filter((p) => p.amountMismatch).length;

  const paymentsForExport = (range: DateRange) =>
    filtered.filter((p) => inDateRange(p.createdAt, range.from, range.to));

  const exportExcel = (range: DateRange) => {
    const rows = paymentsForExport(range);
    if (rows.length === 0) return;
    downloadExcel(
      `careerbuddies-payments-${stampFileDate()}`,
      'Payments',
      [
        'Date (IST)',
        'Order ref',
        'Customer name',
        'Email',
        'Mobile',
        'Item',
        'Type',
        'Base (₹)',
        'GST (₹)',
        'GST %',
        'Total (₹)',
        'Currency',
        'Status',
        'Failure reason',
        'Account id',
      ],
      rows.map((p) => {
        const paid = p.status === 'succeeded';
        const total = minorToMajor(undefined, paid, p);
        const base = typeof p.baseAmount === 'number' ? p.baseAmount / 100 : '';
        const gst = typeof p.gstAmount === 'number' ? p.gstAmount / 100 : '';
        return [
          formatWhen(p.createdAt),
          p.orderRef,
          p.customerName || '',
          p.customerEmail || '',
          p.customerMobile || '',
          p.itemName || '',
          p.itemType || '',
          base,
          gst,
          p.gstRate ?? '',
          total ?? '',
          (paid && p.currency) || p.expectedCurrency || p.currency || 'INR',
          STATUS_LABEL[p.status] || p.status,
          p.failureReason || '',
          p.candidateId ? String(p.candidateId) : '',
        ];
      })
    );
    setExportOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[#cbdaff] pb-5">
        <div>
          <h2 className="text-lg font-bold text-[#061b3b] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#002869]" />
            Payments & checkouts
          </h2>
          <p className="text-xs text-[#666a76] mt-1 max-w-xl">
            All online payment attempts (Razorpay). Status comes from verified checkout signatures and webhooks. Linked
            account is the candidate who started checkout.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="px-3 py-1.5 rounded-xl bg-[#f1f3ff] text-[#002869] border border-[#cbdaff]">
            {items.length} total
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#79fd8d]/25 text-[#00531d] border border-[#a5d6a7]/50">
            {succeededCount} paid
          </span>
          {mismatchCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {mismatchCount} amount review
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#666a76] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            aria-label="Search payments"
            type="text"
            placeholder="Order ref, email, name, item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter by payment status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3"
          >
            <option value="all">All statuses</option>
            <option value="succeeded">Paid</option>
            <option value="processing">Processing</option>
            <option value="created">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
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
        <table className="w-full text-left table-fixed min-w-[880px]">
          <thead>
            <tr>
              <th className="w-[150px]">Date (IST)</th>
              <th className="w-[160px]">Order ref</th>
              <th className="w-[200px]">Customer</th>
              <th className="w-[200px]">Item</th>
              <th className="w-[120px]">Amount</th>
              <th className="w-[110px]">Status</th>
              <th className="w-[110px]">Account</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const paid = p.status === 'succeeded';
              const currency = (paid && p.currency) || p.expectedCurrency || p.currency || 'INR';
              const amount = minorToMajor(undefined, paid, p);
              return (
                <tr
                  key={p.orderRef}
                  className="cursor-pointer"
                  onClick={() => setOpenPayment(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenPayment(p);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Open payment ${p.orderRef}`}
                >
                  <td className="text-[var(--admin-muted)] whitespace-nowrap">{formatWhen(p.createdAt)}</td>
                  <td className="font-mono text-[12px] text-[var(--admin-text)] truncate" title={p.orderRef}>{p.orderRef}</td>
                  <td>
                    <strong className="block truncate" title={p.customerName || ''}>{p.customerName || '—'}</strong>
                    <span className="block text-[12px] text-[var(--admin-muted)] truncate" title={p.customerEmail || ''}>{p.customerEmail || '—'}</span>
                  </td>
                  <td>
                    <span className="block truncate" title={p.itemName || ''}>{p.itemName || '—'}</span>
                    <span className="block text-[12px] text-[var(--admin-muted)] capitalize truncate">{p.itemType || ''}</span>
                  </td>
                  <td>
                    <span className="block truncate">{formatMoney(amount, currency)}</span>
                    {p.gstRate ? <span className="block text-[11px] text-[var(--admin-muted)]">incl. GST</span> : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setStatusPayment(p); }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className={`inline-flex max-w-full truncate px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer ${statusTone(p.status)}`}
                      aria-label={`Change status for order ${p.orderRef} (currently ${STATUS_LABEL[p.status] || p.status})`}
                      title="Change status"
                    >
                      {STATUS_LABEL[p.status] || p.status}
                    </button>
                  </td>
                  <td className="font-mono text-[11px] text-[var(--admin-muted)] truncate" title={p.candidateId || ''}>
                    {p.candidateId ? String(p.candidateId) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && !error && (
          <p className="text-center text-sm text-[#666a76] py-10">
            {items.length === 0 ? 'No payments recorded yet.' : 'No payments match your filters.'}
          </p>
        )}
        {loading && items.length === 0 && <TableSkeleton rows={6} />}
      </div>

      <ExportExcelDialog
        isOpen={exportOpen}
        title="Export payments"
        description="Only Payments tab rows. Choose a date range, then download an Excel file."
        matchCount={(range) => paymentsForExport(range).length}
        onClose={() => setExportOpen(false)}
        onExport={exportExcel}
      />

      {openPayment && <PaymentDetailModal payment={openPayment} onClose={() => setOpenPayment(null)} />}

      {statusPayment && (
        <StatusChangeModal
          payment={statusPayment}
          onClose={() => setStatusPayment(null)}
          onMarked={() => { setStatusPayment(null); load(); }}
        />
      )}
    </div>
  );
};
