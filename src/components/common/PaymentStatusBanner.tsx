import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { candidateFetch } from '../../utils/candidateAuth';

type Status = 'created' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'expired';

// Shown after Dodo redirects back to `/?order=<ref>`. The status shown comes
// from the server (updated by verified webhooks), not from the URL, so it
// cannot be spoofed by editing the query string.
export const PaymentStatusBanner: React.FC = () => {
  const [orderRef] = useState(() => new URLSearchParams(window.location.search).get('order'));
  // Dodo sends the customer to the cancel URL (…&cancelled=1) when they leave checkout without paying.
  const [cameBackCancelled] = useState(() => new URLSearchParams(window.location.search).get('cancelled') === '1');
  const [gaveUp, setGaveUp] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [itemName, setItemName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!orderRef) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        // Only the candidate who started the payment can read its status.
        const res = await candidateFetch(`/api/payments/status/${encodeURIComponent(orderRef)}`);
        if (res.status === 401) {
          if (!cancelled) setNeedsLogin(true);
          return;
        }
        if (res.status === 404 || res.status === 400) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (cancelled || !data.success) return;
        setStatus(data.status);
        setItemName(data.itemName || '');
        // Webhook can arrive a few seconds after the redirect — keep checking briefly.
        if ((data.status === 'created' || data.status === 'processing') && attempts < 10) {
          setTimeout(poll, 3000);
        } else if (data.status === 'created' || data.status === 'processing') {
          setGaveUp(true);
        }
      } catch {
        if (!cancelled && attempts < 10) setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderRef]);

  if (!orderRef || dismissed || notFound) return null;

  const dismiss = () => {
    setDismissed(true);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const view =
    status === 'succeeded'
      ? { tone: 'bg-[#e8f5e9] border-[#a5d6a7] text-[#1b5e20]', icon: <CheckCircle2 className="w-5 h-5 shrink-0" />, text: `Payment successful${itemName ? ` for ${itemName}` : ''}. Thank you! You can see it under Payment History in your Candidate Area.` }
      : status === 'failed'
      ? { tone: 'bg-red-50 border-red-200 text-red-800', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'Your payment could not be completed. You have not been charged — please try again.' }
      : status === 'cancelled'
      ? { tone: 'bg-amber-50 border-amber-200 text-amber-800', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'Payment was cancelled. You can try again whenever you are ready.' }
      : status === 'expired'
      ? { tone: 'bg-amber-50 border-amber-200 text-amber-800', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'This checkout expired before a payment was confirmed. You have not been charged — please start again.' }
      : needsLogin
      ? { tone: 'bg-[#f1f3ff] border-[#cbdaff] text-[#002869]', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'Please log in to your Candidate Area to see the status of your payment.' }
      : cameBackCancelled
      ? { tone: 'bg-amber-50 border-amber-200 text-amber-800', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'Checkout was cancelled and no payment has been confirmed. You can try again whenever you are ready.' }
      : gaveUp
      ? { tone: 'bg-[#f1f3ff] border-[#cbdaff] text-[#002869]', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'We have not received a payment confirmation yet. Payments can take a few minutes to confirm — check Payment History in your Candidate Area shortly. If you were charged and it does not appear, contact CareerBuddies.' }
      : { tone: 'bg-[#f1f3ff] border-[#cbdaff] text-[#002869]', icon: <Loader2 className="w-5 h-5 shrink-0 animate-spin" />, text: 'Confirming your payment…' };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-xl">
      <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg text-xs font-bold ${view.tone}`} role="status">
        {view.icon}
        <span className="flex-1 leading-relaxed">{view.text}</span>
        <button onClick={dismiss} className="p-0.5 cursor-pointer" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PaymentStatusBanner;
