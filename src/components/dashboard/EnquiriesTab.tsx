import React, { useState } from 'react';
import { candidateFetch } from '../../utils/candidateAuth';
import { CheckCircle2, Send } from 'lucide-react';
import { EmptyState, EnquiryRecord, formatDate } from './dashboardShared';

interface EnquiriesTabProps {
  enquiries: EnquiryRecord[];
  loading: boolean;
  loadError: boolean;
  onCreated: (enquiry: EnquiryRecord) => void;
  onLogout: () => void;
}

export const EnquiriesTab: React.FC<EnquiriesTabProps> = ({ enquiries, loading: dataLoading, loadError: dataError, onCreated, onLogout }) => {
  // Enquiry Submission State
  const [enquirySubject, setEnquirySubject] = useState('');
  const [enquiryCategory, setEnquiryCategory] = useState('Career Plan & Milestones');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquirySubject.trim() || !enquiryMessage.trim()) return;
    setEnquiryError(null);

    try {
      const res = await candidateFetch('/api/candidate/enquiries', {
        method: 'POST',
        body: JSON.stringify({ subject: enquirySubject, category: enquiryCategory, message: enquiryMessage })
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok || !body.success) {
        setEnquiryError(body.error || 'Could not send your enquiry. Please try again.');
        return;
      }
      onCreated(body.enquiry);
      setEnquirySubject('');
      setEnquiryMessage('');
      setEnquirySuccess(true);
      setTimeout(() => setEnquirySuccess(false), 4000);
    } catch {
      setEnquiryError('Could not send your enquiry. Please check your connection and try again.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
        <div>
          <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
            Enquiry History & Ticket Support
          </h2>
          <p className="text-xs sm:text-sm text-[#434652]">
            Track previous enquiries, roadmap queries, and advisor recommendations.
          </p>
        </div>
      </div>

      {/* Submit New Query Box */}
      <form onSubmit={handleEnquirySubmit} className="p-5 rounded-2xl bg-[#f1f3ff] border border-[#cbdaff] flex flex-col gap-3.5">
        <h3 className="text-xs font-black uppercase text-[#002869] tracking-wider">
          Submit New Enquiry / Ticket to Career Advisor
        </h3>

        {enquiryError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
            {enquiryError}
          </div>
        )}

        {enquirySuccess && (
          <div className="p-3 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Enquiry sent! The CareerBuddies team will get back to you.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="dash-field-13" className="block text-xs font-bold text-[#061b3b] mb-1">Subject / Question *</label>
            <input id="dash-field-13"
              type="text"
              required
              value={enquirySubject}
              onChange={(e) => setEnquirySubject(e.target.value)}
              placeholder="e.g. Question on System Design Mock Scheduling"
              className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
            />
          </div>
          <div>
            <label htmlFor="dash-field-14" className="block text-xs font-bold text-[#061b3b] mb-1">Category *</label>
            <select id="dash-field-14"
              value={enquiryCategory}
              onChange={(e) => setEnquiryCategory(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs cursor-pointer"
            >
              <option value="Career Plan & Milestones">Career Plan & Milestones</option>
              <option value="Profile Engineering">Profile Engineering</option>
              <option value="Master Session Scheduling">Master Session Scheduling</option>
              <option value="Billing & Invoices">Billing & Invoices</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="dash-field-15" className="block text-xs font-bold text-[#061b3b] mb-1">Detailed Message *</label>
          <textarea id="dash-field-15"
            rows={2}
            required
            value={enquiryMessage}
            onChange={(e) => setEnquiryMessage(e.target.value)}
            placeholder="Provide context on your question..."
            className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Ticket to Advisor</span>
          </button>
        </div>
      </form>

      {/* Enquiries Log */}
      <div className="flex flex-col gap-3.5">
        {enquiries.length === 0 && (
          <EmptyState
            title={dataLoading ? 'Loading your enquiries…' : dataError ? 'Could not load your enquiries' : 'No enquiries yet'}
            hint={dataLoading || dataError ? undefined : 'Enquiries you submit will appear here.'}
          />
        )}
        {enquiries.map((enq) => (
          <div key={enq.id} className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#002869]">ENQ-{enq.id.slice(-6).toUpperCase()}</span>
                <span className="text-[11px] px-2 py-0.5 bg-[#dae2ff] text-[#001947] rounded-full font-bold">
                  {enq.category}
                </span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                enq.resolved ? 'bg-[#79fd8d]/30 text-[#00531d]' : 'bg-amber-100 text-amber-800'
              }`}>
                {enq.status}
              </span>
            </div>

            <h3 className="text-xs font-bold text-[#061b3b]">{enq.subject}</h3>
            <span className="text-[11px] text-[#666a76]">{formatDate(enq.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
