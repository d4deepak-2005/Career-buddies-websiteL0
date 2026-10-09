import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, RefreshCw } from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth';
import { Skeleton } from '../../common/Skeleton';

interface TeamRow {
  id: string;
  name: string;
  createdAt?: string;
}

function formatWhen(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const AdminTeamPanel: React.FC = () => {
  const [items, setItems] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminFetch('/api/admin/team');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not load team users.');
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Could not load team users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not create admin user.');
        return;
      }
      setName('');
      setPassword('');
      await load();
    } catch {
      setError('Could not create admin user.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (id: string) => {
    if (resetPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not update password.');
        return;
      }
      setResetId(null);
      setResetPassword('');
    } catch {
      setError('Could not update password.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this admin user? Their password will stop working.')) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/team/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not remove admin user.');
        return;
      }
      setItems((prev) => prev.filter((row) => row.id !== id));
    } catch {
      setError('Could not remove admin user.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#061b3b]">Create admin user</h2>
          <p className="text-xs text-[#666a76]">
            Login still asks only for a password. This person can enter with the password you set here.
          </p>
        </div>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="team-name" className="block text-xs font-bold text-[#061b3b] mb-1">Name</label>
            <input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#e0e8ff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]"
              placeholder="Team member name"
            />
          </div>
          <div>
            <label htmlFor="team-password" className="block text-xs font-bold text-[#061b3b] mb-1">Password</label>
            <input
              id="team-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#e0e8ff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]"
              placeholder="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim() || password.length < 8}
            className="px-4 py-2.5 bg-[#002869] hover:bg-[#0b3d91] text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Create'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#cbdaff] shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#061b3b]">Team passwords</h2>
            <p className="text-xs text-[#666a76]">The owner password from the server env still works and is not listed here.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="p-2 rounded-xl border border-[#cbdaff] text-[#002869] hover:bg-[#f1f3ff] cursor-pointer"
            aria-label="Refresh team users"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div role="alert" className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#f1f3ff] border border-[#cbdaff]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#002869] text-[#79fd8d] flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#061b3b]">Owner</p>
                  <p className="text-[11px] text-[#666a76]">Server password — always accepted</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wide text-[#006e29] bg-[#79fd8d]/30 px-2 py-1 rounded-lg">
                Env
              </span>
            </div>

            {items.length === 0 && (
              <p className="text-xs text-[#666a76] px-1 py-2">No extra admin users yet. Create one above.</p>
            )}

            {items.map((row) => (
              <div key={row.id} className="px-4 py-3 rounded-2xl border border-[#e0e8ff] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#061b3b] truncate">{row.name}</p>
                    <p className="text-[11px] text-[#666a76]">Added {formatWhen(row.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setResetId(resetId === row.id ? null : row.id);
                        setResetPassword('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-[#cbdaff] text-[11px] font-bold text-[#002869] hover:bg-[#f1f3ff] cursor-pointer"
                    >
                      Set password
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => handleDelete(row.id)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                      aria-label={`Remove ${row.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {resetId === row.id && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#f9f9ff] border border-[#e0e8ff] rounded-xl text-xs text-[#061b3b] focus:outline-none focus:border-[#002869]"
                      placeholder="New password (8+ characters)"
                    />
                    <button
                      type="button"
                      disabled={busyId === row.id || resetPassword.length < 8}
                      onClick={() => handleReset(row.id)}
                      className="px-3 py-2 bg-[#002869] text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === row.id ? 'Saving...' : 'Save password'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
