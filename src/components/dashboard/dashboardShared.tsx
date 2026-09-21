import React from 'react';

// Types and helpers shared by the Candidate Area dashboard and its tabs.
export interface PaymentRecord {
  id: string;
  itemType: string;
  itemName: string;
  status: string;
  amount: number | null;
  currency: string;
  createdAt: string;
}

export interface EnquiryRecord {
  id: string;
  createdAt: string;
  subject: string;
  category: string;
  status: string;
  resolved: boolean;
}

export interface WebinarRecord {
  id: string;
  title: string;
  speaker: string;
  date: string;
  time: string;
  description: string;
  link: string;
  amount: number | null;
}

export const NOT_AVAILABLE = 'Not available yet';
export const COMPLETE_PROFILE = 'Complete your profile to see this';

export const formatINR = (amount: number | null) =>
  amount === null ? NOT_AVAILABLE : `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  succeeded: 'Paid & Verified',
  created: 'Payment Pending',
  processing: 'Payment Processing',
  failed: 'Payment Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const EmptyState: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="p-8 rounded-2xl bg-[#f9f9ff] border border-dashed border-[#cbdaff] text-center">
    <p className="text-sm font-black text-[#061b3b]">{title}</p>
    {hint && <p className="text-xs text-[#434652] mt-1">{hint}</p>}
  </div>
);

// Records an admin has added for this candidate (or sent to everyone). Nothing here is generated.
export interface NotificationRecord { id: string; title: string; description: string; createdAt: string; read: boolean }
export interface MaterialRecord { id: string; title: string; description: string; url: string; category: string; createdAt: string }
export interface SessionRecord {
  id: string; title: string; description: string; url: string; startsAt: string | null; durationMinutes: number | null;
  advisorName: string; advisorRole: string; status: 'scheduled' | 'completed' | 'cancelled';
}
export interface InvoiceRecord { id: string; title: string; description: string; url: string; invoiceNo: string; amount: number | null; currency: string; issuedAt: string }

export const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export const formatMoney = (amount: number | null, currency: string) =>
  typeof amount === 'number' ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(amount) : NOT_AVAILABLE;
