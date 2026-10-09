import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { startCheckout, getCheckoutQuote, CheckoutQuote, CheckoutRequest } from '../../utils/checkout';
import { formatINR } from '../../utils/gst';
import { ModalA11y } from '../common/ModalA11y';

interface OnlineCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: CheckoutRequest['itemType'];
  itemId?: string;
  itemName: string;
  extraDetails?: Record<string, unknown>;
}

// Compact "who is paying" form used by Plans / Programmes. Payment itself
// happens in Razorpay Checkout. The amount comes from the server (CMS).
export const OnlineCheckoutModal: React.FC<OnlineCheckoutModalProps> = ({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
  extraDetails,
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
  const alreadyPaid = Boolean(quote?.alreadyPaid);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadyPaid && quote?.orderRef) {
      window.location.href = `/?order=${encodeURIComponent(quote.orderRef)}`;
      return;
    }
    setError('');
    setBusy(true);
    const result = await startCheckout({
      itemType,
      itemId,
      itemName,
      customer: { name: name.trim(), email: email.trim(), mobile: mobile.trim() },
      details: { source: 'enroll-now', itemName, ...extraDetails },
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
            <h3 className="text-base font-black text-[#061b3b]">{alreadyPaid ? 'Already purchased' : 'Enroll now'}</h3>
            <p className="text-xs text-[#666a76] mt-0.5">{itemName}</p>
            {quoteState === 'loading' && <p className="text-xs text-[#666a76] mt-1">Loading price…</p>}
            {alreadyPaid && <p className="text-xs font-bold text-[#006e29] mt-1">You have already paid for this. No further charge is needed.</p>}
            {quote && !alreadyPaid && (
              <div className="mt-2 text-xs text-[#434652] space-y-0.5">
                <p className="flex justify-between gap-4"><span>Base price</span><span className="font-bold text-[#061b3b]">{formatINR(quote.baseAmount ?? quote.amount)}</span></p>
                <p className="flex justify-between gap-4"><span>GST ({quote.gstPercent ?? 18}%)</span><span className="font-bold text-[#061b3b]">{formatINR(quote.gstAmount ?? 0)}</span></p>
                <p className="flex justify-between gap-4 text-sm font-black text-[#061b3b] pt-0.5">
                  <span>Total (incl. GST)</span>
                  <span>{money}</span>
                </p>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#666a76] hover:text-[#061b3b] cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!alreadyPaid && (
          <>
            <input aria-label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
            <input aria-label="Email address" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
            <input aria-label="Mobile number (optional)" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile (optional)" className={inputClass} />
          </>
        )}

        {error && <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">{error}</div>}

        <button
          type="submit"
          disabled={busy || quoteState !== 'ready'}
          className="px-5 py-2.5 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4 text-[#79fd8d]" />
          <span>
            {alreadyPaid ? 'View payment status' : busy ? 'Opening secure checkout...' : 'Continue to secure payment'}
          </span>
        </button>
        {!alreadyPaid && quote && (
        <p className="text-[11px] text-[#666a76] text-center">
          You will pay {money} in Razorpay&apos;s secure checkout, including 18% GST. Card and UPI details never stay on CareerBuddies.
          If you already paid for this while logged in, you will not be charged again.
          {quote.testMode && <span className="block font-bold text-amber-700 mt-1">Test mode: no real money is charged.</span>}
        </p>
        )}
      </form>
    </div>
  );
};

export default OnlineCheckoutModal;
