import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import type { CandidateProfile } from '../../utils/candidateAuth';
import { MentorDashboardScreen } from './MentorDashboardScreen';
import { MentorLoginScreen, type SessionPayload } from './MentorLoginScreen';

// Entry point for the #mentor route. Decides between the mentor sign-in, a
// "this is a candidate account" notice, and the Mentor Portal dashboard.
// Auth is the site's shared candidate session; the role comes from the account's
// accountType ("mentor" vs "mentee"), which is set at sign-up.

const PREVIEW_HASH = '#mentor/preview';
const previewAllowed = import.meta.env.DEV;

interface MentorPortalProps {
  account: CandidateProfile | null;
  authChecked: boolean;
  onSignedIn: (session: SessionPayload) => void;
  onSignOut: () => void;
  onExitToSite: () => void;
  onOpenCandidateLogin: () => void;
  onOpenCandidateArea: () => void;
}

export const MentorPortal: React.FC<MentorPortalProps> = ({
  account,
  authChecked,
  onSignedIn,
  onSignOut,
  onExitToSite,
  onOpenCandidateLogin,
  onOpenCandidateArea,
}) => {
  const [preview, setPreview] = useState(
    () => previewAllowed && (window.location.hash === PREVIEW_HASH || window.location.pathname === '/mentor/preview')
  );

  const setPreviewMode = (on: boolean) => {
    setPreview(on);
    const target = on ? '/mentor/preview' : '/mentor';
    window.history.replaceState(window.history.state, '', target + window.location.search);
  };

  if (account?.accountType === 'mentor') {
    return <MentorDashboardScreen account={account} onSignOut={onSignOut} onExitToSite={onExitToSite} />;
  }

  if (preview && !account) {
    return <MentorDashboardScreen account={null} onSignOut={() => setPreviewMode(false)} onExitToSite={onExitToSite} />;
  }

  if (!authChecked) {
    return (
      <div className="admin-console admin-theme-light w-full min-h-screen flex items-center justify-center">
        <div className="w-full max-w-[400px] h-72 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-sidebar)] animate-pulse" />
      </div>
    );
  }

  if (account) {
    // Signed in, but with a candidate (mentee) account.
    return (
      <div className="admin-console admin-theme-light w-full min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-[420px] bg-[var(--admin-sidebar)] rounded-2xl border border-[var(--admin-border)] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--admin-active)] text-[var(--admin-accent)] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-muted)]">Career Buddies | Mentor Portal</p>
              <h1 className="text-[17px] font-semibold text-[var(--admin-text)]">This is a candidate account</h1>
            </div>
          </div>
          <p className="text-[13px] text-[var(--admin-muted)]">
            You are signed in as {account.firstName || account.email}. The Mentor Portal is only for mentor accounts.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-btn-primary" onClick={onOpenCandidateArea}>
              Go to my Candidate Area
            </button>
            <button type="button" className="admin-btn" onClick={onSignOut}>
              Sign out and use a mentor account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MentorLoginScreen
      onSignedIn={onSignedIn}
      onOpenCandidateLogin={onOpenCandidateLogin}
      onExitToSite={onExitToSite}
      onPreview={previewAllowed ? () => setPreviewMode(true) : undefined}
    />
  );
};

export default MentorPortal;
