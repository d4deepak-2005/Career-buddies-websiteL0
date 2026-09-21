import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { startCheckout, getCheckoutQuote, CheckoutQuote, CheckoutRequest } from '../../utils/checkout';
import { ModalA11y } from '../common/ModalA11y';

interface OnlineCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: CheckoutRequest['itemType'];
  itemId?: string;
  itemName: string;
}

// Compact "who is paying" form used by Plans / Programmes. Payment itself
// happens on Dodo Payments' hosted checkout page.
export const OnlineCheckoutModal: React.FC<OnlineCheckoutModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteState, setQuoteState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  // The amount shown comes from the server (verified against the payment product), not from the page.
  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    setQuote(null);
    setQuoteState('loading');
    setError('');
    getCheckoutQuote(itemType, itemId).then((r) => {
      if (!live) return;
      if (r.ok === true) {
        setQuote(r.quote);
        setQuoteState('ready');
      } else {
        setError(r.error);
        setQuoteState('unavailable');
      }
    });
    return () => {
      live = false;
    };
  }, [isOpen, itemType, itemId]);

  if (!isOpen) return null;

  const money = quote
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: quote.currency }).format(quote.amount)
    : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await startCheckout({
      itemType,
      itemId,
      itemName,
      customer: { name: name.trim(), email: email.trim(), mobile: mobile.trim() },
    });
    if (!result.ok) {
      setError(result.error || 'Unable to start payment.');
      setBusy(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061b3b]/70 backdrop-blur-sm">
      <ModalA11y label="Online checkout" onClose={onClose} />
      <form
        onSubmit={submit}
        className="bg-white rounded-3xl w-full max-w-md border border-[#cbdaff] shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#061b3b]">Pay online</h3>
            <p className="text-xs text-[#666a76] mt-0.5">{itemName}</p>
            {quoteState === 'loading' && <p className="text-xs text-[#666a76] mt-1">Loading price…</p>}
            {quote && <p className="text-sm font-black text-[#061b3b] mt-1">{money} <span className="text-[11px] font-bold text-[#666a76]">({quote.currency})</span></p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#666a76] hover:text-[#061b3b] cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input aria-label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
        <input aria-label="Email address" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
        <input aria-label="Mobile number (optional)" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile (optional)" className={inputClass} />

        {error && <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">{error}</div>}

        <button
          type="submit"
          disabled={busy || quoteState !== 'ready'}
          className="px-5 py-2.5 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4 text-[#79fd8d]" />
          <span>{busy ? 'Redirecting to secure checkout...' : 'Continue to secure payment'}</span>
        </button>
        <p className="text-[11px] text-[#666a76] text-center">
          You will be redirected to Dodo Payments' secure page to pay. Your payment is confirmed only after Dodo notifies us.
          {quote?.testMode && <span className="block font-bold text-amber-700 mt-1">Test mode: no real money is charged.</span>}
        </p>
      </form>
    </div>
  );
};

export default OnlineCheckoutModal;
