import React, { useEffect, useState } from 'react';
import { CandidateProfile, candidateFetch, setCandidateToken } from '../../utils/candidateAuth';
import { PageView } from '../../types';
import { DEFAULT_SITE_CONFIG } from '../../config/siteConfig';
import { PageBottomNav } from '../common/PageBottomNav';
import { ModalA11y } from '../common/ModalA11y';
import { 
  User, 
  Sparkles, 
  Calendar, 
  FileText, 
  CreditCard, 
  Download, 
  CheckCircle2, 
  Video, 
  Headphones, 
  MessageSquare, 
  Bell, 
  Edit3, 
  Save, 
  Eye, 
  X, 
  Send, 
  Layers,
  ArrowRight,
  ShieldCheck,
  FolderDown,
  Printer,
  Lock,
  Globe,
  Settings,
  HelpCircle,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

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

interface PaymentRecord {
  id: string;
  itemType: string;
  itemName: string;
  status: string;
  amount: number | null;
  currency: string;
  createdAt: string;
}

interface EnquiryRecord {
  id: string;
  createdAt: string;
  subject: string;
  category: string;
  status: string;
  resolved: boolean;
}

interface WebinarRecord {
  id: string;
  title: string;
  speaker: string;
  date: string;
  time: string;
  description: string;
  link: string;
  amount: number | null;
}

const NOT_AVAILABLE = 'Not available yet';
const COMPLETE_PROFILE = 'Complete your profile to see this';

const formatINR = (amount: number | null) =>
  amount === null ? NOT_AVAILABLE : `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  succeeded: 'Paid & Verified',
  created: 'Payment Pending',
  processing: 'Payment Processing',
  failed: 'Payment Failed',
  cancelled: 'Cancelled',
};

const EmptyState: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="p-8 rounded-2xl bg-[#f9f9ff] border border-dashed border-[#cbdaff] text-center">
    <p className="text-sm font-black text-[#061b3b]">{title}</p>
    {hint && <p className="text-xs text-[#434652] mt-1">{hint}</p>}
  </div>
);

export const CandidateDashboardScreen: React.FC<CandidateDashboardScreenProps> = ({
  setActivePage,
  candidate,
  onCandidateUpdate,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Profile: the source of truth is the authenticated candidate saved in MongoDB.
  const candidateProfile = candidate;
  const profileToForm = (c: CandidateProfile) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    mobile: c.mobile,
    alternateNumber: c.alternateNumber,
    alternateEmail: c.alternateEmail,
    currentDesignation: c.currentDesignation,
    totalExperience: c.totalExperience,
    targetRole: c.targetRole,
    linkedinUrl: c.linkedinUrl,
    portfolioUrl: c.portfolioUrl,
    bio: c.bio
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState(() => profileToForm(candidate));
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  // Enquiry Submission State
  const [enquirySubject, setEnquirySubject] = useState('');
  const [enquiryCategory, setEnquiryCategory] = useState('Career Plan & Milestones');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  // Security / Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    { stage: 'Step 1', title: 'Live Mentor-Led Webinar (₹199 Entry)', desc: hasWebinarPass ? 'You have registered for a live webinar.' : 'Register for a live webinar to begin your journey.' },
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

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      const res = await candidateFetch('/api/candidate/me', {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok || !body.success) {
        setProfileError(body.error || 'Could not save your profile. Please try again.');
        return;
      }
      onCandidateUpdate(body.candidate);
      setIsEditingProfile(false);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch {
      setProfileError('Could not save your profile. Please check your connection and try again.');
    }
  };

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
      setEnquiries([body.enquiry, ...enquiries]);
      setEnquirySubject('');
      setEnquiryMessage('');
      setEnquirySuccess(true);
      setTimeout(() => setEnquirySuccess(false), 4000);
    } catch {
      setEnquiryError('Could not send your enquiry. Please check your connection and try again.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      setPasswordError('Please ensure all fields are filled and new passwords match.');
      setTimeout(() => setPasswordError(null), 4000);
      return;
    }
    setPasswordError(null);

    try {
      const res = await candidateFetch('/api/candidate/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        setPasswordError(body.error || 'Could not update your password.');
        setTimeout(() => setPasswordError(null), 5000);
        return;
      }
      setCandidateToken(body.token, body.expiresAt);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch {
      setPasswordError('Could not update your password. Please try again.');
      setTimeout(() => setPasswordError(null), 5000);
    }
  };

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
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Candidate Profile & Career Credentials
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Keep your work experience and target roles updated for the profile engineering team.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditForm(profileToForm(candidate));
                  setProfileError(null);
                  setIsEditingProfile(!isEditingProfile);
                }}
                className="px-4 py-2 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingProfile ? 'Cancel Editing' : 'Edit Profile Information'}</span>
              </button>
            </div>

            {profileSaveSuccess && (
              <div className="p-4 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] text-xs font-bold rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Candidate profile updated successfully!</span>
              </div>
            )}

            {profileError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl">
                {profileError}
              </div>
            )}

            {isEditingProfile ? (
              /* Editable Profile Form */
              <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dash-field-1" className="block text-xs font-black text-[#061b3b] mb-1">First Name *</label>
                  <input id="dash-field-1"
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-2" className="block text-xs font-black text-[#061b3b] mb-1">Last Name *</label>
                  <input id="dash-field-2"
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-3" className="block text-xs font-black text-[#061b3b] mb-1">Email Address *</label>
                  <input id="dash-field-3"
                    type="email"
                    value={candidateProfile.email}
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 bg-[#f1f3ff] border border-[#cbdaff] rounded-xl text-xs text-[#666a76]"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-4" className="block text-xs font-black text-[#061b3b] mb-1">Mobile Number *</label>
                  <input id="dash-field-4"
                    type="tel"
                    required
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-5" className="block text-xs font-medium text-[#434652] mb-1">Alternate Number (Optional)</label>
                  <input id="dash-field-5"
                    type="tel"
                    value={editForm.alternateNumber}
                    onChange={(e) => setEditForm({ ...editForm, alternateNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-6" className="block text-xs font-medium text-[#434652] mb-1">Alternate Email ID (Optional)</label>
                  <input id="dash-field-6"
                    type="email"
                    value={editForm.alternateEmail}
                    onChange={(e) => setEditForm({ ...editForm, alternateEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-7" className="block text-xs font-black text-[#061b3b] mb-1">Current Designation *</label>
                  <input id="dash-field-7"
                    type="text"
                    required
                    value={editForm.currentDesignation}
                    onChange={(e) => setEditForm({ ...editForm, currentDesignation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-8" className="block text-xs font-black text-[#061b3b] mb-1">Target Role *</label>
                  <input id="dash-field-8"
                    type="text"
                    required
                    value={editForm.targetRole}
                    onChange={(e) => setEditForm({ ...editForm, targetRole: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-9" className="block text-xs font-black text-[#061b3b] mb-1">Total Work Experience *</label>
                  <input id="dash-field-9"
                    type="text"
                    required
                    value={editForm.totalExperience}
                    onChange={(e) => setEditForm({ ...editForm, totalExperience: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-10" className="block text-xs font-medium text-[#434652] mb-1">LinkedIn Profile Link (Optional)</label>
                  <input id="dash-field-10"
                    type="url"
                    value={editForm.linkedinUrl}
                    onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="dash-field-11" className="block text-xs font-medium text-[#434652] mb-1">Portfolio / GitHub (Optional)</label>
                  <input id="dash-field-11"
                    type="url"
                    value={editForm.portfolioUrl}
                    onChange={(e) => setEditForm({ ...editForm, portfolioUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="dash-field-12" className="block text-xs font-black text-[#061b3b] mb-1">Additional Information / Target Goal</label>
                  <textarea id="dash-field-12"
                    rows={3}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-[#cbdaff]">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-5 py-2.5 border border-[#cbdaff] text-xs font-bold rounded-xl text-[#434652] hover:bg-[#f1f3ff] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save & Update Profile</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Static Profile Details Display */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Full Name</span>
                  <strong className="text-sm font-black text-[#061b3b] block mt-0.5">
                    {fullName}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Registered Email Address</span>
                  <strong className="text-xs font-bold text-[#002869] block mt-0.5 break-all">
                    {candidateProfile.email}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Primary Contact Mobile</span>
                  <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
                    {candidateProfile.mobile || 'Not Provided'}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Alternate Mobile Number</span>
                  <span className="text-xs font-medium text-[#434652] block mt-0.5">
                    {candidateProfile.alternateNumber || 'Not Provided'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Alternate Email ID</span>
                  <span className="text-xs font-medium text-[#434652] block mt-0.5 break-all">
                    {candidateProfile.alternateEmail || 'Not Provided'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Current Role & Level</span>
                  <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
                    {candidateProfile.currentDesignation || 'Not Provided'}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Target Role</span>
                  <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
                    {candidateProfile.targetRole || 'Not Provided'}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Total Work Experience</span>
                  <strong className="text-xs font-bold text-[#061b3b] block mt-0.5">
                    {candidateProfile.totalExperience || 'Not Provided'}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">LinkedIn Profile URL</span>
                  {candidateProfile.linkedinUrl ? (
                    <a
                      href={candidateProfile.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#002869] hover:underline block mt-0.5 truncate"
                    >
                      {candidateProfile.linkedinUrl}
                    </a>
                  ) : (
                    <span className="text-xs font-medium text-[#434652] block mt-0.5">Not Provided</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff]">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Portfolio / Code Repositories</span>
                  {candidateProfile.portfolioUrl ? (
                    <a
                      href={candidateProfile.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#002869] hover:underline block mt-0.5 truncate"
                    >
                      {candidateProfile.portfolioUrl}
                    </a>
                  ) : (
                    <span className="text-xs font-medium text-[#434652] block mt-0.5">Not Provided</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#cbdaff] md:col-span-2 lg:col-span-3">
                  <span className="text-[#666a76] block text-[11px] font-semibold">Candidate Target Narrative & Bio</span>
                  <p className="text-xs text-[#434652] mt-1 leading-relaxed">
                    {candidateProfile.bio || COMPLETE_PROFILE}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

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
        {activeTab === 'enquiries' && (
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
        )}

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
                  Access your registered ₹199 live webinars, view schedule details, and join links.
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
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
              <div>
                <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
                  Account Settings & Security Preferences
                </h2>
                <p className="text-xs sm:text-sm text-[#434652]">
                  Manage authentication credentials, notification channels, and privacy preferences.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Password & Authentication */}
              <div className="p-6 rounded-3xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col gap-4">
                <h3 className="text-base font-black text-[#061b3b] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#002869]" />
                  <span>Update Password</span>
                </h3>

                {passwordSuccess && (
                  <div className="p-3 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] text-xs font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Password updated successfully!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="dash-field-16" className="block text-xs font-bold text-[#061b3b] mb-1">Current Password *</label>
                    <input id="dash-field-16"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="dash-field-17" className="block text-xs font-bold text-[#061b3b] mb-1">New Password *</label>
                    <input id="dash-field-17"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="dash-field-18" className="block text-xs font-bold text-[#061b3b] mb-1">Confirm New Password *</label>
                    <input id="dash-field-18"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-2 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer"
                  >
                    Save New Password
                  </button>
                </form>
              </div>

              {/* Notification Preferences & 2FA */}
              <div className="p-6 rounded-3xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col justify-between gap-5">
                <div>
                  <h3 className="text-base font-black text-[#061b3b] flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-[#006e29]" />
                    <span>Security & Notification Alerts</span>
                  </h3>

                  <div className="flex flex-col gap-4 text-xs">
                    {[
                      { title: 'WhatsApp Session Reminders', note: 'Session reminders are not available yet.' },
                      { title: 'Email Invoice & Deliverable Updates', note: 'Email updates are not available yet.' },
                      { title: 'Two-Factor Authentication (2FA)', note: 'Two-factor authentication is not available yet. Your account is protected by your password only.' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#e0e8ff]">
                        <div>
                          <strong className="text-[#061b3b] block">{item.title}</strong>
                          <span className="text-[#666a76] text-[11px]">{item.note}</span>
                        </div>
                        <span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-[#666a76] bg-[#f1f3ff] border border-[#cbdaff] rounded-full px-2 py-0.5">Not available</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

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
