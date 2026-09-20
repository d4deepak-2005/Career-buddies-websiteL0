import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

type Status = 'created' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

// Shown after Dodo redirects back to `/?order=<ref>`. The status shown comes
// from the server (updated by verified webhooks), not from the URL, so it
// cannot be spoofed by editing the query string.
export const PaymentStatusBanner: React.FC = () => {
  const [orderRef] = useState(() => new URLSearchParams(window.location.search).get('order'));
  const [status, setStatus] = useState<Status | null>(null);
  const [itemName, setItemName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!orderRef) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/payments/status/${encodeURIComponent(orderRef)}`);
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
      ? { tone: 'bg-[#e8f5e9] border-[#a5d6a7] text-[#1b5e20]', icon: <CheckCircle2 className="w-5 h-5 shrink-0" />, text: `Payment successful${itemName ? ` for ${itemName}` : ''}. Thank you! A confirmation will be sent to your email.` }
      : status === 'failed'
      ? { tone: 'bg-red-50 border-red-200 text-red-800', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'Your payment could not be completed. You have not been charged — please try again.' }
      : status === 'cancelled'
      ? { tone: 'bg-amber-50 border-amber-200 text-amber-800', icon: <AlertCircle className="w-5 h-5 shrink-0" />, text: 'Payment was cancelled. You can try again whenever you are ready.' }
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
