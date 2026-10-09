import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, GraduationCap, LayoutDashboard } from 'lucide-react';
import type { CandidateProfile } from '../../utils/candidateAuth';

// Mentor sign-in, styled like the admin console (not the navy candidate modal).
// It uses the SAME account system as the candidate login (/api/candidate/login and
// /api/candidate/signup with accountType "mentor"), so there is one shared auth;
// only accounts whose accountType is "mentor" are let into the portal.

export interface SessionPayload {
  token: string;
  expiresAt: number;
  candidate: CandidateProfile;
}

interface MentorLoginScreenProps {
  onSignedIn: (session: SessionPayload) => void;
  onOpenCandidateLogin: () => void;
  onExitToSite: () => void;
  // Dev-only shortcut to look at the dashboard with sample data.
  onPreview?: () => void;
}

type Mode = 'login' | 'signup' | 'forgot';

export const MentorLoginScreen: React.FC<MentorLoginScreenProps> = ({ onSignedIn, onOpenCandidateLogin, onExitToSite, onPreview }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'forgot') {
        const res = await fetch('/api/candidate/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) throw new Error(body.error || 'Something went wrong. Please try again.');
        setNotice(`If an account exists for ${email}, a password reset link is on its way. It expires in 30 minutes.`);
        return;
      }
      const res = await fetch(`/api/candidate/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? { name, email, password, accountType: 'mentor' } : { email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.error || 'Something went wrong. Please try again.');
      if (body.candidate?.accountType !== 'mentor') {
        // Valid credentials, but a candidate account: keep the user out of the portal and
        // do not store the session here.
        setError('This is a candidate account, not a mentor account. Please use the candidate login on the main site.');
        return;
      }
      setPassword('');
      onSignedIn({ token: body.token, expiresAt: body.expiresAt, candidate: body.candidate });
    } catch (err: any) {
      setError(err?.message && err.message !== 'Failed to fetch' ? err.message : 'Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const heading = mode === 'login' ? 'Mentor sign in' : mode === 'signup' ? 'Create a mentor account' : 'Reset your password';
  const sub =
    mode === 'login'
      ? 'Sign in to see your assigned candidates, sessions and follow-ups.'
      : mode === 'signup'
        ? 'For Career Buddies mentors and advisors. Your sessions appear once candidates are assigned to you.'
        : 'Enter the email you use for Career Buddies and we will send you a reset link.';

  return (
    <div className="admin-console admin-theme-light w-full min-h-screen flex flex-col">
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-header)]">
        <p className="text-[15px] text-[var(--admin-text)]">
          <span className="font-semibold">Career Buddies</span>
          <span className="text-[var(--admin-muted)]"> | Mentor Portal</span>
        </p>
        <button type="button" className="admin-btn" onClick={onExitToSite}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to website</span>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] flex flex-col gap-4">
          <form
            onSubmit={submit}
            className="bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] p-6 sm:p-7 flex flex-col gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--admin-active)] text-[var(--admin-accent)] flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Mentor Portal</p>
                <h1 className="text-[18px] font-semibold tracking-tight text-[var(--admin-text)]">{heading}</h1>
              </div>
            </div>
            <p className="text-[13px] text-[var(--admin-muted)] -mt-1">{sub}</p>

            {mode === 'signup' && (
              <div>
                <label htmlFor="mentor-name" className="block text-[12px] font-medium text-[var(--admin-text)] mb-1.5">
                  Full name
                </label>
                <input id="mentor-name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="Your full name" />
              </div>
            )}

            <div>
              <label htmlFor="mentor-email" className="block text-[12px] font-medium text-[var(--admin-text)] mb-1.5">
                Email
              </label>
              <input
                id="mentor-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="mentor-password" className="block text-[12px] font-medium text-[var(--admin-text)]">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')} className="text-[12px] text-[var(--admin-accent)] hover:underline cursor-pointer">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="mentor-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'signup' ? 8 : undefined}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                    placeholder="••••••••"
                    ref={(el) => el?.style.setProperty('padding-right', '2.5rem', 'important')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-[12px] font-medium rounded-lg">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="admin-tone-ok p-2.5 text-[12px] font-medium rounded-lg">
                {notice}
              </div>
            )}

            <button type="submit" disabled={busy} className="admin-btn-primary w-full">
              {busy ? 'Please wait...' : mode === 'login' ? 'Sign in to Mentor Portal' : mode === 'signup' ? 'Create mentor account' : 'Send reset link'}
            </button>

            <div className="pt-3 border-t border-[var(--admin-border)] text-[12px] text-[var(--admin-muted)] text-center">
              {mode === 'login' ? (
                <>
                  New mentor?{' '}
                  <button type="button" onClick={() => switchMode('signup')} className="text-[var(--admin-accent)] font-medium hover:underline cursor-pointer">
                    Create a mentor account
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => switchMode('login')} className="text-[var(--admin-accent)] font-medium hover:underline cursor-pointer">
                  Back to mentor sign in
                </button>
              )}
            </div>
          </form>

          <p className="text-[12px] text-[var(--admin-muted)] text-center">
            Looking for your candidate account?{' '}
            <button type="button" onClick={onOpenCandidateLogin} className="text-[var(--admin-accent)] font-medium hover:underline cursor-pointer">
              Candidate login
            </button>
          </p>

          {onPreview && (
            <button type="button" onClick={onPreview} className="admin-btn self-center">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Preview dashboard with sample data (dev only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
