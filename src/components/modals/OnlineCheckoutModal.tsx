import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { startCheckout, CheckoutRequest } from '../../utils/checkout';

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

  if (!isOpen) return null;

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
      <form
        onSubmit={submit}
        className="bg-white rounded-3xl w-full max-w-md border border-[#cbdaff] shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#061b3b]">Pay online</h3>
            <p className="text-xs text-[#747783] mt-0.5">{itemName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#747783] hover:text-[#061b3b] cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile (optional)" className={inputClass} />

        {error && <div className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4 text-[#79fd8d]" />
          <span>{busy ? 'Redirecting to secure checkout...' : 'Continue to secure payment'}</span>
        </button>
        <p className="text-[11px] text-[#747783] text-center">Secure payment powered by Dodo Payments.</p>
      </form>
    </div>
  );
};

export default OnlineCheckoutModal;
