import React, { useState } from 'react';
import { WebinarItem, WebinarRegistration } from '../../types';
import { startCheckout } from '../../utils/checkout';
import { DEFAULT_SITE_CONFIG } from '../../config/siteConfig';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Download,
  Video,
  Copy,
  Check,
  Home,
  MessageSquare
} from 'lucide-react';
import { HandshakeIcon } from '../common/HandshakeIcon';
import { ModalA11y } from '../common/ModalA11y';

interface WebinarCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  webinar: WebinarItem | null;
  onRegistrationSuccess?: (registration: WebinarRegistration) => void;
  onBackToHome?: () => void;
}

export const WebinarCheckoutModal: React.FC<WebinarCheckoutModalProps> = ({
  isOpen,
  onClose,
  webinar,
  onRegistrationSuccess,
  onBackToHome
}) => {
  if (!isOpen || !webinar) return null;

  const [step, setStep] = useState<'details' | 'review' | 'payment' | 'success'>('details');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [totalExperience, setTotalExperience] = useState('');
  
  // Optional Fields
  const [alternateNumber, setAlternateNumber] = useState('');
  const [alternateEmail, setAlternateEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [questionForSpeaker, setQuestionForSpeaker] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Payment methods
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'gpay' | 'card' | 'netbanking'>('upi_qr');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [completedRegistration, setCompletedRegistration] = useState<WebinarRegistration | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const price = webinar.priceINR || DEFAULT_SITE_CONFIG.webinarDefaultPriceINR;

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const validateMobile = (val: string) => {
    const cleaned = val.replace(/[\s\-()]/g, '');
    return /^(\+?\d{1,4})?[6-9]\d{9}$/.test(cleaned);
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (!mobile.trim()) {
      errs.mobile = 'Mobile number is required';
    } else if (!validateMobile(mobile)) {
      errs.mobile = 'Please enter a valid 10-digit mobile number';
    }
    if (!email.trim()) {
      errs.email = 'Email ID is required';
    } else if (!validateEmail(email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!currentDesignation.trim()) errs.currentDesignation = 'Current designation is required';
    if (!totalExperience.trim()) errs.totalExperience = 'Total work experience is required';

    if (alternateEmail.trim() && !validateEmail(alternateEmail)) {
      errs.alternateEmail = 'Please enter a valid alternate email address';
    }
    if (alternateNumber.trim() && !validateMobile(alternateNumber)) {
      errs.alternateNumber = 'Please enter a valid alternate mobile number';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setStep('review');
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setPaymentError('');

    // Real payment: the server creates a Dodo Payments checkout session and
    // we redirect to Dodo's hosted checkout. Payment status is confirmed by
    // Dodo's signed webhook, not by this browser.
    const result = await startCheckout({
      itemType: 'webinar',
      itemId: webinar.id,
      itemName: webinar.title,
      customer: {
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        mobile: mobile.trim()
      },
      details: {
        currentDesignation,
        totalExperience,
        alternateNumber,
        alternateEmail,
        linkedinUrl,
        questionForSpeaker: questionForSpeaker.trim()
      }
    });

    if (!result.ok) {
      setPaymentError(result.error || 'Unable to start payment.');
      setIsProcessing(false);
    }
  };

  const handleCopyLink = () => {
    if (completedRegistration) {
      navigator.clipboard.writeText(completedRegistration.meetLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const stepNumbers = {
    details: 1,
    review: 2,
    payment: 3,
    success: 4
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061b3b]/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <ModalA11y label="Webinar registration" onClose={onClose} />
      <div className="bg-white rounded-3xl w-full max-w-2xl border border-[#cbdaff] shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        
        {/* Navigation & Header Bar */}
        <div className="bg-[#002869] text-white p-6 relative overflow-hidden shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onBackToHome && (
                <button
                  onClick={() => {
                    onClose();
                    onBackToHome();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>← Home</span>
                </button>
              )}
              <span className="text-xs font-bold text-[#dae2ff] flex items-center gap-1.5">
                <span>Masterclass Pass</span>
                <span className="text-[#79fd8d]">| ₹{price}</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3">
            <h2 className="text-lg sm:text-xl font-bold font-['Plus_Jakarta_Sans',sans-serif] leading-tight line-clamp-1">
              {webinar.title}
            </h2>
            <p className="text-xs text-[#dae2ff] mt-0.5">
              Speaker: {webinar.speaker.name} ({webinar.speaker.company}) • {webinar.date} at {webinar.time}
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/15 text-[11px] font-bold">
            <span className={step === 'details' ? 'text-[#79fd8d]' : 'text-white/60'}>
              1. Registration Details
            </span>
            <span className="text-white/60">→</span>
            <span className={step === 'review' ? 'text-[#79fd8d]' : 'text-white/60'}>
              2. Review Order
            </span>
            <span className="text-white/60">→</span>
            <span className={step === 'payment' ? 'text-[#79fd8d]' : 'text-white/60'}>
              3. Secure Payment
            </span>
            <span className="text-white/60">→</span>
            <span className={step === 'success' ? 'text-[#79fd8d]' : 'text-white/60'}>
              4. Ticket Confirmed
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex flex-col gap-6">
          
          {/* STEP 1: Registration Form */}
          {step === 'details' && (
            <form noValidate onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#061b3b]">
                  Enter Attendee Information
                </h3>
                <span className="text-xs font-bold text-[#006e29] bg-[#79fd8d]/20 px-2 py-0.5 rounded">
                  Pass: ₹{price}
                </span>
              </div>

              {/* Row 1: First Name * & Last Name * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-1" className="text-xs font-bold text-[#061b3b]">
                    First Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input id="webinar-field-1"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) setFieldErrors({ ...fieldErrors, firstName: '' });
                    }}
                    placeholder="e.g. Rahul"
                    className={`w-full px-3 py-2 bg-[#f9f9ff] border rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869] ${
                      fieldErrors.firstName ? 'border-red-400 bg-red-50/40' : 'border-[#cbdaff]'
                    }`}
                  />
                  {fieldErrors.firstName && <span className="text-[11px] text-red-600 font-bold">{fieldErrors.firstName}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-2" className="text-xs font-bold text-[#061b3b]">
                    Last Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input id="webinar-field-2"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (fieldErrors.lastName) setFieldErrors({ ...fieldErrors, lastName: '' });
                    }}
                    placeholder="e.g. Sharma"
                    className={`w-full px-3 py-2 bg-[#f9f9ff] border rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869] ${
                      fieldErrors.lastName ? 'border-red-400 bg-red-50/40' : 'border-[#cbdaff]'
                    }`}
                  />
                  {fieldErrors.lastName && <span className="text-[11px] text-red-600 font-bold">{fieldErrors.lastName}</span>}
                </div>
              </div>

              {/* Row 2: Mobile Number * & Email ID * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-3" className="text-xs font-bold text-[#061b3b]">
                    Mobile Number <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input id="webinar-field-3"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      if (fieldErrors.mobile) setFieldErrors({ ...fieldErrors, mobile: '' });
                    }}
                    placeholder="10-digit mobile number"
                    className={`w-full px-3 py-2 bg-[#f9f9ff] border rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869] ${
                      fieldErrors.mobile ? 'border-red-400 bg-red-50/40' : 'border-[#cbdaff]'
                    }`}
                  />
                  {fieldErrors.mobile && <span className="text-[11px] text-red-600 font-bold">{fieldErrors.mobile}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-4" className="text-xs font-bold text-[#061b3b]">
                    Email ID <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input id="webinar-field-4"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                    }}
                    placeholder="rahul.sharma@example.com"
                    className={`w-full px-3 py-2 bg-[#f9f9ff] border rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869] ${
                      fieldErrors.email ? 'border-red-400 bg-red-50/40' : 'border-[#cbdaff]'
                    }`}
                  />
                  {fieldErrors.email && <span className="text-[11px] text-red-600 font-bold">{fieldErrors.email}</span>}
                </div>
              </div>

              {/* Row 3: Current Designation * & Total Work Experience * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-5" className="text-xs font-bold text-[#061b3b]">
                    Current Designation <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input id="webinar-field-5"
                    type="text"
                    required
                    value={currentDesignation}
                    onChange={(e) => {
                      setCurrentDesignation(e.target.value);
                      if (fieldErrors.currentDesignation) setFieldErrors({ ...fieldErrors, currentDesignation: '' });
                    }}
                    placeholder="e.g. Senior Software Engineer"
                    className={`w-full px-3 py-2 bg-[#f9f9ff] border rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869] ${
                      fieldErrors.currentDesignation ? 'border-red-400 bg-red-50/40' : 'border-[#cbdaff]'
                    }`}
                  />
                  {fieldErrors.currentDesignation && <span className="text-[11px] text-red-600 font-bold">{fieldErrors.currentDesignation}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-6" className="text-xs font-bold text-[#061b3b]">
                    Total Work Experience <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select id="webinar-field-6"
                    required
                    value={totalExperience}
                    onChange={(e) => {
                      setTotalExperience(e.target.value);
                      if (fieldErrors.totalExperience) setFieldErrors({ ...fieldErrors, totalExperience: '' });
                    }}
                    className={`w-full px-3 py-2 bg-[#f9f9ff] border rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869] cursor-pointer ${
                      fieldErrors.totalExperience ? 'border-red-400 bg-red-50/40' : 'border-[#cbdaff]'
                    }`}
                  >
                    <option value="">Select Total Experience</option>
                    <option value="0-1 Year (Student / Fresher)">0-1 Year (Student / Fresher)</option>
                    <option value="1-3 Years (Junior / Mid)">1-3 Years (Junior / Mid)</option>
                    <option value="3-6 Years (Senior Level)">3-6 Years (Senior Level)</option>
                    <option value="6-10 Years (Lead / Staff Level)">6-10 Years (Lead / Staff Level)</option>
                    <option value="10+ Years (Executive / Principal)">10+ Years (Executive / Principal)</option>
                  </select>
                  {fieldErrors.totalExperience && <span className="text-[11px] text-red-600 font-bold">{fieldErrors.totalExperience}</span>}
                </div>
              </div>

              {/* Optional Section */}
              <div className="pt-2 border-t border-[#cbdaff]/70 flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase text-[#666a76] tracking-wider">
                  Additional Details (Optional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="webinar-field-7" className="text-xs font-medium text-[#434652]">
                      Alternate Number <span className="text-[#666a76] font-normal">(Optional)</span>
                    </label>
                    <input id="webinar-field-7"
                      type="tel"
                      value={alternateNumber}
                      onChange={(e) => setAlternateNumber(e.target.value)}
                      placeholder="Alternate phone / WhatsApp"
                      className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="webinar-field-8" className="text-xs font-medium text-[#434652]">
                      Alternate Email ID <span className="text-[#666a76] font-normal">(Optional)</span>
                    </label>
                    <input id="webinar-field-8"
                      type="email"
                      value={alternateEmail}
                      onChange={(e) => setAlternateEmail(e.target.value)}
                      placeholder="personal.email@example.com"
                      className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-9" className="text-xs font-medium text-[#434652]">
                    LinkedIn Profile Link <span className="text-[#666a76] font-normal">(Optional)</span>
                  </label>
                  <input id="webinar-field-9"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="webinar-field-10" className="text-xs font-medium text-[#434652]">
                    Question for {webinar.speaker.name} <span className="text-[#666a76] font-normal">(Optional)</span>
                  </label>
                  <textarea id="webinar-field-10"
                    rows={2}
                    value={questionForSpeaker}
                    onChange={(e) => setQuestionForSpeaker(e.target.value)}
                    placeholder="Ask a technical or career question for the live Q&A segment..."
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs sm:text-sm text-[#061b3b] focus:outline-none focus:border-[#002869]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-[#434652] hover:text-[#061b3b] cursor-pointer"
                >
                  ← Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next: Review Order</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#79fd8d]" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Review Order */}
          {step === 'review' && (
            <div className="flex flex-col gap-5">
              <h3 className="text-base font-bold text-[#061b3b]">
                Review Registration Details
              </h3>

              <div className="bg-[#f9f9ff] p-5 rounded-2xl border border-[#cbdaff] flex flex-col gap-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <div>
                    <span className="text-xs text-[#666a76] block">Item</span>
                    <span className="text-sm font-bold text-[#061b3b]">{webinar.title}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#666a76] block">Price</span>
                    <span className="text-sm font-black text-[#006e29]">₹{price}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#666a76]">Attendee:</span>
                    <p className="font-bold text-[#061b3b]">{firstName} {lastName}</p>
                  </div>
                  <div>
                    <span className="text-[#666a76]">Email:</span>
                    <p className="font-bold text-[#061b3b]">{email}</p>
                  </div>
                  <div>
                    <span className="text-[#666a76]">Mobile:</span>
                    <p className="font-bold text-[#061b3b]">{mobile}</p>
                  </div>
                  <div>
                    <span className="text-[#666a76]">Designation:</span>
                    <p className="font-bold text-[#061b3b]">{currentDesignation}</p>
                  </div>
                  <div>
                    <span className="text-[#666a76]">Experience:</span>
                    <p className="font-bold text-[#061b3b]">{totalExperience}</p>
                  </div>
                  <div>
                    <span className="text-[#666a76]">Session Date:</span>
                    <p className="font-bold text-[#061b3b]">{webinar.date}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-[#061b3b]">Total Amount Payable:</span>
                  <span className="text-base font-black text-[#002869]">₹{price} (All Inclusive)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#434652] hover:text-[#061b3b] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('payment')}
                  className="px-6 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Payment (₹{price})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#79fd8d]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment */}
          {step === 'payment' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#061b3b]">
                  Secure Payment
                </h3>
                <span className="text-xs font-black text-[#006e29]">Pay ₹{price}</span>
              </div>

              <div className="bg-[#f9f9ff] p-5 rounded-2xl border border-[#cbdaff] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-[#002869]">
                  <ShieldCheck className="w-4 h-4 text-[#006e29]" />
                  <span>Powered by Dodo Payments</span>
                </div>
                <p className="text-xs text-[#434652] leading-relaxed">
                  You will be taken to a secure hosted checkout page to complete your payment.
                  Your card and bank details are never entered or stored on CareerBuddies.
                </p>
              </div>

              {paymentError && (
                <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                  {paymentError}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#434652] hover:text-[#061b3b] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Back to Review</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProcessPayment}
                  className="px-6 py-2.5 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-[#79fd8d]" />
                  <span>{isProcessing ? 'Redirecting to secure checkout...' : `Pay Securely (₹${price})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Ticket Confirmation */}
          {step === 'success' && completedRegistration && (
            <div className="flex flex-col gap-5 text-center animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-[#79fd8d]/25 text-[#006e29] flex items-center justify-center mx-auto border border-[#006e29]/20 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#006e29]">
                  Pass Confirmed & Registered
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif] mt-1">
                  You're all set for the Masterclass!
                </h3>
                <p className="text-xs text-[#434652] mt-1">
                  Confirmation receipt has been sent to <strong>{completedRegistration.email}</strong>
                </p>
              </div>

              {/* Ticket Card */}
              <div className="bg-[#f9f9ff] p-5 rounded-2xl border border-[#cbdaff] flex flex-col gap-3 text-left">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-[#666a76]">Registration ID</span>
                    <p className="text-xs font-mono font-bold text-[#002869]">{completedRegistration.id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase font-bold text-[#666a76]">Payment Ref</span>
                    <p className="text-xs font-mono font-bold text-[#006e29]">{completedRegistration.paymentId}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#666a76]">Session Link (Google Meet):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={completedRegistration.meetLink}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#cbdaff] rounded-xl text-xs font-mono text-[#002869]"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-[#002869] text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-[#0b3d91] cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-[#79fd8d]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs text-[#061b3b]">
                  <MessageSquare className="w-4 h-4 text-[#006e29]" />
                  <span>WhatsApp reminder will be sent to {completedRegistration.mobile} 2 hours before the start.</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Done & Close
                </button>

                {onBackToHome && (
                  <button
                    onClick={() => {
                      onClose();
                      onBackToHome();
                    }}
                    className="px-5 py-2.5 bg-white border border-[#cbdaff] text-[#002869] text-xs font-bold rounded-xl hover:bg-[#dae2ff] transition-all cursor-pointer"
                  >
                    ← Back to Home
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
