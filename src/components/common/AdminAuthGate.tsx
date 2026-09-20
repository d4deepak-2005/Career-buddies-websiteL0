import React, { useState } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { isAdminAuthenticated, setAdminToken, clearAdminToken } from '../../utils/adminAuth';

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(isAdminAuthenticated());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        setAdminToken(data.token, data.expiresAt);
        setAuthenticated(true);
      } else {
        setError(data.error || 'Incorrect password.');
      }
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setAuthenticated(false);
    setPassword('');
  };

  if (!authenticated) {
    return (
      <div className="w-full min-h-screen bg-[#f9f9ff] flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white p-8 rounded-2xl border border-[#e0e8ff] shadow-xs flex flex-col gap-4"
        >
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#dae2ff] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#002869]" />
            </div>
            <h1 className="text-lg font-bold text-[#061b3b]">Team Access</h1>
            <p className="text-xs text-[#747783] text-center">
              This area contains internal lead data. Enter the admin password to continue.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#061b3b] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#e0e8ff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="px-4 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full bg-white border-b border-[#e0e8ff] px-4 sm:px-6 lg:px-10 py-2 flex items-center justify-end">
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#747783] hover:text-[#061b3b] cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </button>
      </div>
      {children}
    </div>
  );
};
