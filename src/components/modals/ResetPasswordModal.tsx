import React, { useEffect, useState } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { ModalA11y } from '../common/ModalA11y';

interface ResetPasswordModalProps {
  token: string;
  onClose: () => void;
  onSignIn: () => void;
  onRequestNewLink: () => void;
}

// Opened from the emailed link (/reset-password?token=...). The token is checked
// with the server first, then exchanged (with the new password) for a reset.
export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  token,
  onClose,
  onSignIn,
  onRequestNewLink
}) => {
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/candidate/reset-password/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then((res) => res.json())
      .then((body) => !cancelled && setStatus(body.valid ? 'ready' : 'invalid'))
      .catch(() => !cancelled && setStatus('invalid'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/candidate/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) {
        setPassword('');
        setConfirm('');
        setStatus('done');
      } else if (res.status === 400 && /invalid or has expired/i.test(body.error || '')) {
        setStatus('invalid');
      } else {
        setError(body.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <ModalA11y label="Reset your password" onClose={onClose} />
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#cbdaff] max-h-[92vh] flex flex-col">
        <div className="px-6 py-5 bg-[#002869] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="white" showTagline={false} className="brightness-200" />
            <h3 className="font-black text-sm tracking-tight">Choose a New Password</h3>
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
          {status === 'checking' && <p className="text-xs text-[#434652]">Checking your reset link…</p>}

          {status === 'invalid' && (
            <>
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                This reset link is invalid or has expired. Links work once and last 30 minutes.
              </div>
              <button
                onClick={onRequestNewLink}
                className="w-full py-3 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl cursor-pointer"
              >
                Request a New Reset Link
              </button>
            </>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{error}</div>
              )}
              <div>
                <label htmlFor="reset-field-1" className="block text-xs font-black text-[#061b3b] mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#666a76] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input id="reset-field-1"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]"
                  />
                  <button aria-label={show ? 'Hide password' : 'Show password'}
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666a76] hover:text-[#061b3b]"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="reset-field-2" className="block text-xs font-black text-[#061b3b] mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#666a76] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input id="reset-field-2"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f9f9ff] border border-[#cbdaff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span>{saving ? 'Saving...' : 'Reset Password'}</span>
                {!saving && <ArrowRight className="w-3.5 h-3.5 text-[#79fd8d]" />}
              </button>
            </form>
          )}

          {status === 'done' && (
            <>
              <div className="p-4 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your password has been reset successfully.</span>
              </div>
              <button
                onClick={onSignIn}
                className="w-full py-3 bg-[#006e29] hover:bg-[#00531d] text-white text-xs font-black rounded-xl cursor-pointer"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
