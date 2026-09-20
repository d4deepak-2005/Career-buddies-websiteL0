import React, { useEffect, useState } from 'react';
import { CandidateProfile, candidateFetch } from '../../utils/candidateAuth';
import { PageView } from '../../types';
import { DEFAULT_SITE_CONFIG } from '../../config/siteConfig';
import { PageBottomNav } from '../common/PageBottomNav';
import { ModalA11y } from '../common/ModalA11y';
import { useWebinarEntryPrice } from '../../hooks/useCmsCatalog';
import { SettingsTab } from './SettingsTab';
import { EnquiriesTab } from './EnquiriesTab';
import { ProfileTab } from './ProfileTab';
import { COMPLETE_PROFILE, EmptyState, EnquiryRecord, NOT_AVAILABLE, PAYMENT_STATUS_LABEL, PaymentRecord, WebinarRecord, formatDate, formatINR } from './dashboardShared';
import { User, Sparkles, Calendar, FileText, CreditCard, Download, CheckCircle2, Video, Headphones, MessageSquare, Bell, Eye, X, Send, Layers, ArrowRight, FolderDown, Printer, Lock, Settings } from 'lucide-react';

interface CandidateDashboardScreenProps {
  setActivePage: (page: PageView) => void;
  candidate: CandidateProfile;
  onCandidateUpdate: (candidate: CandidateProfile) => void;
  onLogout: () => void;
}

type DashboardTab =
  | 'overview'
  | 'profile'
  | 'plan'
  | 'payments'
  | 'invoices'
  | 'enquiries'
  | 'webinars'
  | 'sessions'
  | 'learning'
  | 'notifications'
  | 'support'
  | 'settings';


export const CandidateDashboardScreen: React.FC<CandidateDashboardScreenProps> = ({
  setActivePage,
  candidate,
  onCandidateUpdate,
  onLogout
}) => {
  const entryPrice = useWebinarEntryPrice();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Profile: the source of truth is the authenticated candidate saved in MongoDB.
  const candidateProfile = candidate;


  // Records that belong to this candidate (payments, enquiries, paid webinars).
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [webinarsList, setWebinarsList] = useState<WebinarRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    candidateFetch('/api/candidate/dashboard')
      .then(async (res) => {
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (!res.ok) throw new Error('Request failed');
        const body = await res.json();
        if (cancelled) return;
        setPayments(body.payments || []);
        setEnquiries(body.enquiries || []);
        setWebinarsList(body.webinars || []);
      })
      .catch(() => !cancelled && setDataError(true))
      .finally(() => !cancelled && setDataLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.id]);

  // Selected Invoice Modal State
  const [viewingInvoice, setViewingInvoice] = useState<{
    id: string;
    date: string;
    item: string;
    amount: string;
    tax: string;
    total: string;
    paymentMode: string;
    status: string;
    invoiceNo: string;
    sacCode: string;
  } | null>(null);



  // No notification records exist yet — nothing is invented.
  const notifications: { id: string; title: string; description: string; time: string; read: boolean }[] = [];
  // No session, learning-material, invoice or advisor-assignment records exist yet.
  const masterSessionsList: any[] = [];
  const documentsList: any[] = [];
  const invoicesList: any[] = [];

  // ---- Values derived from the candidate's real records ----
  const fullName = `${candidateProfile.firstName} ${candidateProfile.lastName}`.trim();
  const initials = `${candidateProfile.firstName[0] || ''}${candidateProfile.lastName[0] || ''}`.toUpperCase();
  const joinedDate = formatDate(candidateProfile.joinedAt);

  const completionFields = [
    candidateProfile.mobile,
    candidateProfile.currentDesignation,
    candidateProfile.totalExperience,
    candidateProfile.targetRole,
    candidateProfile.linkedinUrl,
    candidateProfile.portfolioUrl,
    candidateProfile.bio
  ];
  // name + email are always present after sign-up (2 of 9)
  const completionPct = Math.round(((completionFields.filter(Boolean).length + 2) / (completionFields.length + 2)) * 100);

  const paidPayments = payments.filter((p) => p.status === 'succeeded');
  const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const planPayment = paidPayments.find((p) => p.itemType === 'plan' || p.itemType === 'programme');
  const hasWebinarPass = paidPayments.some((p) => p.itemType === 'webinar');
  const isEnrolled = !!planPayment;

  const paymentsList = payments.map((p) => ({
    id: p.id,
    date: formatDate(p.createdAt),
    item: p.itemName || 'CareerBuddies purchase',
    total: formatINR(p.amount),
    status: PAYMENT_STATUS_LABEL[p.status] || p.status,
    paid: p.status === 'succeeded'
  }));

  // 7-stage journey, derived only from what the records actually show.
  const hasEnquiry = enquiries.length > 0;
  const advisorEngaged = enquiries.some((e) => e.status !== 'Under Review');
  const journeyDone = [hasWebinarPass, hasEnquiry, advisorEngaged, isEnrolled, false, false, false];
  const activeStageIdx = journeyDone.findIndex((d) => !d);
  const journeySteps = [
    { stage: 'Step 1', title: `Live Mentor-Led Webinar (₹${entryPrice} Entry)`, desc: hasWebinarPass ? 'You have registered for a live webinar.' : 'Register for a live webinar to begin your journey.' },
    { stage: 'Step 2', title: 'Expressed Interest & Profile Diagnosis', desc: hasEnquiry ? 'Your enquiry has been shared with CareerBuddies advisors.' : 'Share your goals with our advisors to get started.' },
    { stage: 'Step 3', title: 'Advisor Requirements Discussion', desc: advisorEngaged ? 'An advisor has picked up your enquiry.' : 'Your advisor will discuss your requirements with you.' },
    { stage: 'Step 4', title: 'Plan Selection & Enrolment', desc: isEnrolled ? `Enrolled in ${planPayment!.itemName}.` : 'Choose and enrol in the plan that fits your goals.' },
    { stage: 'Step 5', title: 'Dedicated Team Works on Profile', desc: 'Your dedicated team works on your profile after enrolment.' },
    { stage: 'Step 6', title: 'Personalized Master Session', desc: 'A 1:1 master session is scheduled once your profile work is underway.' },
    { stage: 'Step 7', title: '90-Day Execution & Mock Interview Sprints', desc: 'Structured weekly milestones, mock loops, and salary negotiation support.' }
  ].map((step, idx) => ({
    ...step,
    status: journeyDone[idx] ? 'completed' : idx === activeStageIdx ? 'active' : 'upcoming'
  }));

  // Navigation Items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'plan', label: 'My Plan', icon: Sparkles },
    { id: 'payments', label: 'Payment History', icon: CreditCard },
    { id: 'invoices', label: 'Invoices & Bills', icon: FileText },
    { id: 'enquiries', label: 'Enquiry History', icon: MessageSquare },
    { id: 'webinars', label: 'Webinars', icon: Video },
    { id: 'sessions', label: 'Master Sessions', icon: Calendar },
    { id: 'learning', label: 'Learning Materials', icon: FolderDown },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n => !n.read).length },
    { id: 'support', label: 'Support & Concierge', icon: Headphones },
    { id: 'settings', label: 'Account Settings', icon: Lock }
  ];




  const handleDownloadDoc = (docTitle: string) => {
    const element = document.createElement('a');
    const file = new Blob([`CareerBuddies Candidate Official Deliverable: ${docTitle}\nCandidate: ${fullName}\nEmail: ${candidateProfile.email}\nDate: ${new Date().toLocaleDateString()}\n\nOfficial CareerBuddies Record: Samhita Spicewood West Block, 6th Main, GM Palya, CV Raman Nagar, Bengaluru, Karnataka - 560075`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = docTitle;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col w-full bg-[#f9f9ff] min-h-screen text-[#061b3b]">
      
      {/* Top Header Banner */}
      <div className="bg-[#002869] text-white py-10 px-4 sm:px-6 lg:px-10 border-b border-[#001947]">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-[#79fd8d] shrink-0 shadow-inner">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#79fd8d]/20 text-[#79fd8d] text-[11px] font-black uppercase tracking-wider border border-[#79fd8d]/30">
                  {isEnrolled ? 'Enrolled Candidate • Active' : 'Candidate Account • Active'}
                </span>
                <span className="text-xs text-[#dae2ff] font-medium hidden sm:inline">
                  Member since {joinedDate}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Plus_Jakarta_Sans',sans-serif]">
                Welcome back, {candidateProfile.firstName}!
              </h1>
              <p className="text-xs sm:text-sm text-[#dae2ff] mt-0.5">
                {candidateProfile.currentDesignation || COMPLETE_PROFILE} • Target: <strong className="text-white">{candidateProfile.targetRole || COMPLETE_PROFILE}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('sessions')}
              className="px-4 py-2.5 rounded-xl bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Next Master Session</span>
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Headphones className="w-4 h-4" />
              <span>Advisor Desk</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col gap-6">
        
        {/* Navigation Tabs Bar - 12 Distinct Sections */}
        <div className="bg-white rounded-2xl p-2 border border-[#cbdaff] shadow-xs overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as DashboardTab)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#002869] text-white shadow-xs'
                    : 'text-[#434652] hover:bg-[#f1f3ff] hover:text-[#002869]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#79fd8d]' : 'text-[#666a76]'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* SECTION A: DASHBOARD OVERVIEW */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Profile Completion */}
              <div className="bg-white rounded-2xl p-5 border border-[#cbdaff] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#666a76] mb-2 font-bold">
                    <span>Profile Status</span>
                    <span className="text-[#006e29] font-black">{completionPct}% Complete</span>
                  </div>
                  <h2 className="text-lg font-black text-[#061b3b]">ATS Profile Optimization</h2>
                  <div className="w-full bg-[#e0e8ff] h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#006e29] h-full rounded-full" style={{ width: `${completionPct}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="mt-4 text-xs font-bold text-[#002869] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{completionPct >= 100 ? 'Review Your Profile' : `Complete Remaining ${100 - completionPct}%`}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Current Active Plan */}
              <div className="bg-white rounded-2xl p-5 border border-[#cbdaff] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#666a76] mb-2 font-bold">
                    <span>Enrolled Plan</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#dae2ff] text-[#001947] text-[11px] font-black">
                      {isEnrolled ? 'Enrolled' : 'Not enrolled'}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-[#061b3b]">
                    {isEnrolled ? planPayment!.itemName : 'No plan enrolled yet'}
                  </h2>
                  <p className="text-xs text-[#434652] mt-1">
                    {isEnrolled ? 'Your plan is active' : 'Your enrolled plan will appear here'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('plan')}
                  className="mt-4 text-xs font-bold text-[#002869] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Plan Milestones</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Payment Status */}
              <div className="bg-white rounded-2xl p-5 border border-[#cbdaff] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#666a76] mb-2 font-bold">
                    <span>Payment Status</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#79fd8d]/30 text-[#00531d] text-[11px] font-black">
                      {paidPayments.length > 0 ? 'Paid & Verified' : 'No payments yet'}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-[#061b3b]">
                    {paidPayments.length > 0 ? `${formatINR(totalPaid)} Total Paid` : NOT_AVAILABLE}
                  </h2>
                  <p className="text-xs text-[#434652] mt-1">
                    {paidPayments.length > 0 ? `${paidPayments.length} verified payment${paidPayments.length > 1 ? 's' : ''}` : 'Your payments will appear here'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="mt-4 text-xs font-bold text-[#002869] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Invoices</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Next Session */}
              <div className="bg-white rounded-2xl p-5 border border-[#cbdaff] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#666a76] mb-2 font-bold">
                    <span>Next Milestone</span>
                    <span className="text-[#002869] font-black">{NOT_AVAILABLE}</span>
                  </div>
                  <h2 className="text-lg font-black text-[#061b3b]">Personalized Master Session</h2>
                  <p className="text-xs text-[#434652] mt-1">No session scheduled yet</p>
                </div>
                <button
                  onClick={() => setActiveTab('sessions')}
                  className="mt-4 text-xs font-bold text-[#006e29] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Master Sessions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* Main Overview Grid: Upcoming Activities + Plan Roadmap */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: 7-Stage Customer Journey Progress */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-[#cbdaff] shadow-xs flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                      Your 7-Stage Progression Blueprint
                    </h2>
                    <p className="text-xs text-[#434652]">
                      Transparent tracking of every phase in your CareerBuddies journey.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-xs font-bold border border-[#a5d6a7]">
                    {activeStageIdx === -1 ? 'All Stages Complete' : `Stage ${activeStageIdx + 1} in Progress`}
                  </span>
                </div>

                <div className="flex flex-col gap-3.5 pt-2">
                  {journeySteps.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all ${
                        item.status === 'completed'
                          ? 'bg-[#f1f8e9] border-[#c8e6c9]'
                          : item.status === 'active'
                          ? 'bg-[#e8edff] border-[#002869] ring-1 ring-[#002869]/20'
                          : 'bg-[#f9f9ff] border-[#e0e8ff] opacity-70'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-[#006e29]" />
                        ) : item.status === 'active' ? (
                          <div className="w-5 h-5 rounded-full bg-[#002869] text-white text-xs font-black flex items-center justify-center animate-pulse">
                            {idx + 1}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#e0e8ff] text-[#666a76] text-xs font-black flex items-center justify-center">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-black text-[#061b3b]">
                            {item.title}
                          </h3>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#666a76]">
                            {item.stage}
                          </span>
                        </div>
                        <p className="text-xs text-[#434652] mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Col: Important Upcoming Activities & Support Desk */}
              <div className="flex flex-col gap-6">
                
                {/* Upcoming Activity Box */}
                <div className="bg-white rounded-3xl p-6 border border-[#cbdaff] shadow-xs flex flex-col gap-4">
                  <h2 className="text-base font-black text-[#061b3b] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#002869]" />
                    <span>Important Activities</span>
                  </h2>

                  <EmptyState
                    title="No upcoming activities"
                    hint="Sessions and deliverables scheduled for you will appear here."
                  />
                </div>

                {/* Assigned Career Advisor Card */}
                <div className="bg-[#f1f3ff] rounded-3xl p-6 border border-[#cbdaff] flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#002869] text-white flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#061b3b]">Advisor not assigned yet</h3>
                      <p className="text-[11px] text-[#434652]">Your career advisor will appear here</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#434652] leading-relaxed">
                    Have questions about your plan, profile or upcoming sessions? Message the CareerBuddies advisor desk directly.
                  </p>
                  <a
                    href={DEFAULT_SITE_CONFIG.whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Advisor Desk ({DEFAULT_SITE_CONFIG.primaryWhatsApp})</span>
                  </a>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION B: MY PROFILE */}
        {/* ============================================================ */}
        <div hidden={activeTab !== 'profile'}>
          <ProfileTab
            candidate={candidate}
            onCandidateUpdate={onCandidateUpdate}
            onLogout={onLogout}
            completionPct={completionPct}
            fullName={fullName}
            initials={initials}
            joinedDate={joinedDate}
          />
        </div>

        {/* ============================================================ */}
        {/* SECTION C: MY PLAN */}
        {/* ============================================================ */}
        {activeTab === 'plan' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Enrolled Programme & Execution Plan
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Comprehensive scope of your active CareerBuddies plan, deliverables, and progress.
                </p>
              </div>
              {isEnrolled && (
                <span className="px-3.5 py-1.5 rounded-full bg-[#79fd8d]/30 text-[#00531d] text-xs font-black">
                  Active
                </span>
              )}
            </div>

            {!isEnrolled ? (
              <EmptyState
                title="You are not enrolled in a plan yet"
                hint="Once you enrol, your plan, its deliverables and milestones will appear here."
              />
            ) : (
            <>

            {/* Plan Highlight Card */}
            <div className="p-6 rounded-3xl bg-[#002869] text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#79fd8d]">
                  Selected Programme Track
                </span>
                <h3 className="text-2xl font-black mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
                  {planPayment?.itemName}
                </h3>
                <p className="text-xs sm:text-sm text-[#dae2ff] mt-1 max-w-xl">
                  Enrolled on {formatDate(planPayment?.createdAt || '')}.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0">
                <span className="text-xs text-[#dae2ff] block">Total Investment</span>
                <span className="text-2xl font-black text-white block">{formatINR(planPayment?.amount ?? null)}</span>
                <span className="text-[11px] text-[#79fd8d] font-bold">Paid & Verified</span>
              </div>
            </div>

            {/* Included Services Breakdown */}
            <div>
              <h3 className="text-base font-black text-[#061b3b] mb-3">
                Included Services & Plan Deliverables
              </h3>
              <EmptyState
                title="Deliverables not available yet"
                hint="Your advisor will share your plan deliverables and next steps here."
              />
            </div>
            </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION D: PAYMENT HISTORY */}
        {/* ============================================================ */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Payment History & Transaction Records
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Detailed ledger of all verified candidate payments, webinars, and transaction reference IDs.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#cbdaff] text-[#666a76] font-bold uppercase tracking-wider bg-[#f1f3ff]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Programme / Item</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e8ff]">
                  {paymentsList.map((pay) => (
                    <tr key={pay.id} className="hover:bg-[#f9f9ff]">
                      <td className="py-3.5 px-4 font-medium text-[#061b3b]">{pay.date}</td>
                      <td className="py-3.5 px-4 font-mono text-[#002869] font-bold">{pay.id}</td>
                      <td className="py-3.5 px-4 font-bold text-[#061b3b]">{pay.item}</td>
                      <td className="py-3.5 px-4 font-black text-[#061b3b] text-sm">{pay.total}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${pay.paid ? 'bg-[#79fd8d]/30 text-[#00531d]' : 'bg-amber-100 text-amber-800'}`}>
                          {pay.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paymentsList.length === 0 && (
                <div className="mt-4">
                  <EmptyState
                    title={dataLoading ? 'Loading your payments…' : dataError ? 'Could not load your payments' : 'No payments yet'}
                    hint={dataLoading || dataError ? undefined : 'Payments you make on CareerBuddies will appear here.'}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION E: INVOICES AND BILLS */}
        {/* ============================================================ */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Tax Invoices & Bills
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Download GST-compliant tax invoices with SAC codes for corporate reimbursements or personal records.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {invoicesList.length === 0 && (
                <EmptyState
                  title="No invoices yet"
                  hint="Tax invoices issued for your payments will appear here."
                />
              )}
              {invoicesList.map((inv) => (
                <div key={inv.invoiceNo} className="p-5 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-black text-xs text-[#002869]">{inv.invoiceNo}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-[#e0e8ff] text-[#001947] rounded-full font-bold">
                        SAC {inv.sacCode.split(' - ')[0]}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#061b3b]">{inv.item}</h3>
                    <p className="text-xs text-[#666a76] mt-0.5">
                      Issued on {inv.date} • Total: <strong className="text-[#061b3b]">{inv.total}</strong> (Includes {inv.tax})
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => setViewingInvoice(inv)}
                      className="px-4 py-2 bg-white border border-[#cbdaff] text-[#002869] text-xs font-bold rounded-xl hover:bg-[#dae2ff] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Invoice</span>
                    </button>
                    <button
                      onClick={() => handleDownloadDoc(`Invoice_${inv.invoiceNo}.pdf`)}
                      className="px-4 py-2 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION F: ENQUIRY HISTORY */}
        {/* ============================================================ */}
        <div hidden={activeTab !== 'enquiries'}>
          <EnquiriesTab
            enquiries={enquiries}
            loading={dataLoading}
            loadError={dataError}
            onCreated={(enquiry) => setEnquiries((prev) => [enquiry, ...prev])}
            onLogout={onLogout}
          />
        </div>

        {/* ============================================================ */}
        {/* SECTION G: WEBINARS */}
        {/* ============================================================ */}
        {activeTab === 'webinars' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Webinars & Live Masterclasses
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Access your registered ₹{entryPrice} live webinars, view schedule details, and join links.
                </p>
              </div>
              <button
                onClick={() => setActivePage('webinars')}
                className="px-4 py-2 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Browse All Webinars</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {webinarsList.length === 0 && (
              <EmptyState
                title={dataLoading ? 'Loading your webinars…' : 'No webinar registrations yet'}
                hint={dataLoading ? undefined : 'Webinars you register for will appear here. Public webinars are listed under Browse All Webinars.'}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {webinarsList.map((web) => (
                <div key={web.id} className="p-6 rounded-3xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#79fd8d]/30 text-[#00531d] text-[11px] font-black">
                        Registered • Confirmed
                      </span>
                      <span className="text-xs font-mono font-bold text-[#002869]">
                        {formatINR(web.amount)} Paid
                      </span>
                    </div>
                    <h3 className="text-base font-black text-[#061b3b]">
                      {web.title}
                    </h3>
                    {web.speaker && (
                      <p className="text-xs text-[#002869] font-bold mt-1">
                        Instructor: {web.speaker}
                      </p>
                    )}
                    <p className="text-xs text-[#434652] mt-2 leading-relaxed">
                      {web.description}
                    </p>

                    {(web.date || web.time) && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-[#e0e8ff] text-xs">
                        <div className="flex items-center gap-2 text-[#061b3b] font-bold">
                          <Calendar className="w-3.5 h-3.5 text-[#002869]" />
                          <span>{web.date || NOT_AVAILABLE}</span>
                        </div>
                        <div className="text-[#666a76] text-[11px] mt-0.5">
                          {web.time}
                        </div>
                      </div>
                    )}
                  </div>

                  {web.link ? (
                    <a
                      href={web.link}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black text-center shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Video className="w-4 h-4 text-[#79fd8d]" />
                      <span>Join Live Webinar Room</span>
                    </a>
                  ) : (
                    <span className="w-full py-3 rounded-xl bg-[#e8edff] text-[#002869] text-xs font-black text-center">
                      Join link will be shared before the webinar
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION H: MASTER SESSIONS */}
        {/* ============================================================ */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Personalized Master Sessions
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  1:1 Technical & Architectural Deep-Dives with Verified Industry Practitioners.
                </p>
              </div>
            </div>

            {masterSessionsList.length === 0 && (
              <EmptyState
                title="No master sessions scheduled yet"
                hint="Your upcoming and completed 1:1 sessions will appear here once they are scheduled for you."
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {masterSessionsList.map((sess) => (
                <div key={sess.id} className="p-6 rounded-3xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                        sess.status.includes('Upcoming') 
                          ? 'bg-[#79fd8d]/30 text-[#00531d]' 
                          : 'bg-[#e0e8ff] text-[#001947]'
                      }`}>
                        {sess.status}
                      </span>
                      <span className="text-xs font-bold text-[#666a76]">{sess.duration}</span>
                    </div>

                    <h3 className="text-base font-black text-[#061b3b]">
                      {sess.title}
                    </h3>

                    <div className="mt-2 p-3 bg-white rounded-2xl border border-[#cbdaff]">
                      <span className="text-[11px] font-black uppercase text-[#666a76] tracking-wider block">
                        Assigned Mentor
                      </span>
                      <strong className="text-xs font-black text-[#002869] block mt-0.5">
                        {sess.mentor}
                      </strong>
                      <span className="text-[11px] text-[#434652] block">
                        {sess.mentorRole}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-[#434652]">
                      <strong className="text-[#061b3b] block mb-0.5">Session Agenda:</strong>
                      <p className="text-xs leading-relaxed">{sess.agenda}</p>
                    </div>

                    <div className="mt-3 p-2.5 rounded-xl bg-[#e8edff] text-xs font-bold text-[#002869] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#002869]" />
                      <span>{sess.date} • {sess.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sess.status.includes('Upcoming') ? (
                      <a
                        href={sess.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-3 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Video className="w-4 h-4 text-[#79fd8d]" />
                        <span>Launch Video Room</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => handleDownloadDoc(`Master_Session_Notes_${sess.id}.pdf`)}
                        className="flex-1 py-3 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Session Debrief</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION I: LEARNING MATERIALS */}
        {/* ============================================================ */}
        {activeTab === 'learning' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Learning Materials & Downloadable Notes
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Access all profile engineering deliverables, masterclass slide decks, and interview cheat sheets.
                </p>
              </div>
            </div>

            {documentsList.length === 0 && (
              <EmptyState
                title="No learning materials yet"
                hint="Deliverables and study material shared with you will appear here."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {documentsList.map((doc) => (
                <div key={doc.id} className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#002869] text-white flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#79fd8d]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#061b3b] truncate max-w-[220px] sm:max-w-xs">
                        {doc.title}
                      </h3>
                      <p className="text-[11px] text-[#666a76]">
                        {doc.category} • {doc.size} • {doc.date}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadDoc(doc.title)}
                    className="px-3.5 py-2 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION J: NOTIFICATIONS */}
        {/* ============================================================ */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Candidate Notifications & Programme Updates
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Stay updated on session reminders, profile deliverables, and invoice releases.
                </p>
              </div>
            </div>

            {notifications.length === 0 && (
              <EmptyState
                title="No notifications yet"
                hint="Session reminders and programme updates will appear here."
              />
            )}

            <div className="flex flex-col gap-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border flex items-start justify-between gap-3.5 transition-all ${
                    !notif.read ? 'bg-[#e8edff] border-[#002869]/40 font-semibold' : 'bg-[#f9f9ff] border-[#e0e8ff]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-xl bg-white border border-[#cbdaff] text-[#002869]">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#061b3b]">{notif.title}</h3>
                      <p className="text-xs text-[#434652] mt-0.5">{notif.description}</p>
                      <span className="text-[11px] text-[#666a76] block mt-1">{notif.time}</span>
                    </div>
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#002869] shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION K: SUPPORT */}
        {/* ============================================================ */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Candidate Support & Advisor Helpdesk
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Direct priority communication channels for enrolled CareerBuddies candidates.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* WhatsApp Priority Support */}
              <div className="p-6 rounded-3xl bg-[#f1f8e9] border border-[#c8e6c9] flex flex-col justify-between gap-4">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#006e29] text-white flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-[#061b3b]">Instant WhatsApp Advisor Desk</h3>
                  <p className="text-xs text-[#434652] mt-1 leading-relaxed">
                    Connect directly with your dedicated advisor for real-time questions regarding session rescheduling, resume feedback, and interview schedules.
                  </p>
                </div>
                <a
                  href={DEFAULT_SITE_CONFIG.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black text-center shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat on WhatsApp: {DEFAULT_SITE_CONFIG.primaryWhatsApp}</span>
                </a>
              </div>

              {/* Email Support */}
              <div className="p-6 rounded-3xl bg-[#e8edff] border border-[#cbdaff] flex flex-col justify-between gap-4">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#002869] text-white flex items-center justify-center mb-3">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-[#061b3b]">Official Email Support Desk</h3>
                  <p className="text-xs text-[#434652] mt-1 leading-relaxed">
                    Send detailed documents, recruiter correspondence, or enterprise reimbursement invoice queries.
                  </p>
                </div>
                <a
                  href={`mailto:${DEFAULT_SITE_CONFIG.supportEmail}`}
                  className="w-full py-3 rounded-xl bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black text-center shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Email: {DEFAULT_SITE_CONFIG.supportEmail}</span>
                </a>
              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION L: ACCOUNT SETTINGS */}
        {/* ============================================================ */}
        {/* These three tabs stay mounted (hidden) so half-typed forms survive switching tabs, as before. */}
        <div hidden={activeTab !== 'settings'}>
          <SettingsTab />
        </div>

      </div>

      {/* Invoice Viewer Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <ModalA11y label="Invoice" onClose={() => setViewingInvoice(null)} />
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#cbdaff] shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-4">
              <div>
                <span className="text-[11px] font-black uppercase text-[#006e29] tracking-wider">
                  Official GST Tax Invoice
                </span>
                <h2 className="text-xl font-black text-[#002869] font-['Plus_Jakarta_Sans',sans-serif]">
                  {viewingInvoice.invoiceNo}
                </h2>
              </div>
              <button aria-label="Close"
                onClick={() => setViewingInvoice(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Printable Invoice Header */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <strong className="text-[#061b3b] block font-bold">Billed By:</strong>
                <span className="text-[#434652] block font-semibold">CareerBuddies Private Limited</span>
                <span className="text-[#666a76] block">{DEFAULT_SITE_CONFIG.officeAddress}</span>
                <span className="text-[#666a76] block">Email: {DEFAULT_SITE_CONFIG.supportEmail}</span>
              </div>
              <div className="text-right">
                <strong className="text-[#061b3b] block font-bold">Billed To:</strong>
                <span className="text-[#434652] block font-semibold">{candidateProfile.firstName} {candidateProfile.lastName}</span>
                <span className="text-[#666a76] block">{candidateProfile.email}</span>
                <span className="text-[#666a76] block">{candidateProfile.mobile}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-[#cbdaff] rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#f1f3ff] text-[#002869] font-bold border-b border-[#cbdaff]">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3">SAC Code</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">GST (18%)</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 font-bold text-[#061b3b]">{viewingInvoice.item}</td>
                    <td className="p-3 font-mono text-[#666a76]">{viewingInvoice.sacCode.split(' - ')[0]}</td>
                    <td className="p-3 text-right font-medium">{viewingInvoice.amount}</td>
                    <td className="p-3 text-right text-[#006e29]">{viewingInvoice.tax}</td>
                    <td className="p-3 text-right font-black text-[#002869]">{viewingInvoice.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#cbdaff]">
              <span className="text-xs text-[#666a76]">
                Payment Status: <strong className="text-[#006e29]">Paid via {viewingInvoice.paymentMode}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white border border-[#cbdaff] text-xs font-bold rounded-xl text-[#002869] flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleDownloadDoc(`Invoice_${viewingInvoice.invoiceNo}.pdf`)}
                  className="px-5 py-2 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <PageBottomNav
        currentPage="dashboard"
        onNavigate={setActivePage}
      />
    </div>
  );
};

export default CandidateDashboardScreen;
