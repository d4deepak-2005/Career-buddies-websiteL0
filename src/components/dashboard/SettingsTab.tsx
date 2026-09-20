import React, { useState } from 'react';
import { candidateFetch, setCandidateToken } from '../../utils/candidateAuth';
import { AlertTriangle, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

interface SettingsTabProps {}

export const SettingsTab: React.FC<SettingsTabProps> = () => {
  // Security / Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      setPasswordError('Please ensure all fields are filled and new passwords match.');
      setTimeout(() => setPasswordError(null), 4000);
      return;
    }
    setPasswordError(null);

    try {
      const res = await candidateFetch('/api/candidate/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        setPasswordError(body.error || 'Could not update your password.');
        setTimeout(() => setPasswordError(null), 5000);
        return;
      }
      setCandidateToken(body.token, body.expiresAt);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch {
      setPasswordError('Could not update your password. Please try again.');
      setTimeout(() => setPasswordError(null), 5000);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-[#cbdaff] pb-5">
        <div>
          <h2 className="text-xl font-black text-[#061b3b] font-['Plus_Jakarta_Sans',sans-serif]">
            Account Settings & Security Preferences
          </h2>
          <p className="text-xs sm:text-sm text-[#434652]">
            Manage authentication credentials, notification channels, and privacy preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Password & Authentication */}
        <div className="p-6 rounded-3xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col gap-4">
          <h3 className="text-base font-black text-[#061b3b] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#002869]" />
            <span>Update Password</span>
          </h3>

          {passwordSuccess && (
            <div className="p-3 bg-[#e8f5e9] border border-[#a5d6a7] text-[#1b5e20] text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <div>
              <label htmlFor="dash-field-16" className="block text-xs font-bold text-[#061b3b] mb-1">Current Password *</label>
              <input id="dash-field-16"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
              />
            </div>
            <div>
              <label htmlFor="dash-field-17" className="block text-xs font-bold text-[#061b3b] mb-1">New Password *</label>
              <input id="dash-field-17"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
              />
            </div>
            <div>
              <label htmlFor="dash-field-18" className="block text-xs font-bold text-[#061b3b] mb-1">Confirm New Password *</label>
              <input id="dash-field-18"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-white border border-[#cbdaff] rounded-xl text-xs"
              />
            </div>
            <button
              type="submit"
              className="mt-2 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer"
            >
              Save New Password
            </button>
          </form>
        </div>

        {/* Notification Preferences & 2FA */}
        <div className="p-6 rounded-3xl bg-[#f9f9ff] border border-[#cbdaff] flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-base font-black text-[#061b3b] flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-[#006e29]" />
              <span>Security & Notification Alerts</span>
            </h3>

            <div className="flex flex-col gap-4 text-xs">
              {[
                { title: 'WhatsApp Session Reminders', note: 'Session reminders are not available yet.' },
                { title: 'Email Invoice & Deliverable Updates', note: 'Email updates are not available yet.' },
                { title: 'Two-Factor Authentication (2FA)', note: 'Two-factor authentication is not available yet. Your account is protected by your password only.' },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#e0e8ff]">
                  <div>
                    <strong className="text-[#061b3b] block">{item.title}</strong>
                    <span className="text-[#666a76] text-[11px]">{item.note}</span>
                  </div>
                  <span className="shrink-0 text-[11px] font-black uppercase tracking-wide text-[#666a76] bg-[#f1f3ff] border border-[#cbdaff] rounded-full px-2 py-0.5">Not available</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
