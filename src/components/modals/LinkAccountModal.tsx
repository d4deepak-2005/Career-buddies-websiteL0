import React, { useEffect, useState } from 'react';
import { X, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

interface LinkAccountModalProps {
  code: string;
  onClose: () => void;
  // Receives the normal session body ({ token, expiresAt, candidate }) after a successful link.
  onLinked: (session: any) => void;
}

interface LinkInfo {
  valid: boolean;
  provider?: string;
  email?: string;
  canUsePassword?: boolean;
  confirmWith?: { id: string; label: string }[];
}

// Shown when a sign-in (e.g. Facebook) returns an email that already belongs to a CareerBuddies
// account but the provider can't vouch for that email. Nothing is linked until the person proves
// they own the existing account: with its password, or by signing in with a method already
// connected to it.
export const LinkAccountModal: React.FC<LinkAccountModalProps> = ({ code, onClose, onLinked }) => {
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/link/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
      .then((res) => res.json())
      .then((body) => !cancelled && setInfo(body.valid ? body : { valid: false }))
      .catch(() => !cancelled && setInfo({ valid: false }));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password })
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) {
        setPassword('');
        onLinked(body);
        return;
      }
      setError(body.error || 'Something went wrong. Please try again.');
      if (res.status === 429 || res.status === 400) setInfo({ valid: false });
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const provider = info?.provider || 'your account';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#cbdaff] max-h-[92vh] flex flex-col">
        <div className="px-6 py-5 bg-[#002869] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="white" showTagline={false} className="brightness-200" />
            <h3 className="font-black text-sm tracking-tight">Confirm It's You</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#dae2ff] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {info === null && <p className="text-xs text-[#434652]">One moment…</p>}

          {info && !info.valid && (
            <>
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                This request has expired. Please start again from the login screen.
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl cursor-pointer"
              >
                Back to Sign In
              </button>
            </>
          )}

          {info?.valid && (
            <>
              <div className="flex items-start gap-2.5 p-3.5 bg-[#f1f3ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b] leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#006e29] shrink-0 mt-0.5" />
                <span>
                  A CareerBuddies account already exists for <strong>{info.email}</strong>. To connect your{' '}
                  <strong>{provider}</strong> login to it safely, please confirm that this account is yours.
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{error}</div>
              )}

              {info.canUsePassword && (
                <form onSubmit={handlePassword} className="flex flex-col gap-3">
                  <label className="block text-xs font-black text-[#061b3b]">Your CareerBuddies password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#747783] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={show ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#747783] hover:text-[#061b3b]"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <span>{busy ? 'Linking...' : `Link ${provider} & Sign In`}</span>
                    {!busy && <ArrowRight className="w-3.5 h-3.5 text-[#79fd8d]" />}
                  </button>
                </form>
              )}

              {!!info.confirmWith?.length && (
                <div className="flex flex-col gap-2">
                  {info.canUsePassword && (
                    <span className="text-[10px] font-black uppercase text-[#747783] tracking-wider text-center">Or confirm with</span>
                  )}
                  {!info.canUsePassword && (
                    <p className="text-xs text-[#434652]">
                      This account has no password. Confirm it with the sign-in method you already use for it:
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {info.confirmWith.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          window.location.href = `/api/auth/${p.id}/start?link=${encodeURIComponent(code)}`;
                        }}
                        className="py-2.5 px-3 rounded-xl border border-[#cbdaff] bg-white hover:bg-[#f1f3ff] text-xs font-bold text-[#061b3b] cursor-pointer"
                      >
                        Continue with {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!info.canUsePassword && !info.confirmWith?.length && (
                <p className="text-xs text-[#434652]">
                  We couldn't find a way to confirm this account right now. Please sign in with the method you used to create it.
                </p>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-[#002869] font-black hover:underline cursor-pointer self-center"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkAccountModal;
