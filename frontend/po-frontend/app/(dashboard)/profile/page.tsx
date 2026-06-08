'use client';

import { useEffect, useState } from 'react';
import { usersApi, budgetsApi, budgetRequestsApi } from '@/lib/api';
import { Budget, BudgetRequest, User } from '@/types';
import { saveUser } from '@/lib/auth';

function daysUntilReset(updatedAt: string): number {
  const resetDate = new Date(updatedAt);
  resetDate.setFullYear(resetDate.getFullYear() + 1);
  const diff = resetDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function resetDateStr(updatedAt: string): string {
  const d = new Date(updatedAt);
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [myRequests, setMyRequests] = useState<BudgetRequest[]>([]);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [supplementDesc, setSupplementDesc] = useState('');
  const [supplementLimit, setSupplementLimit] = useState('');
  const [supplementLoading, setSupplementLoading] = useState(false);
  const [supplementSuccess, setSupplementSuccess] = useState(false);

  useEffect(() => {
    usersApi.me().then((u) => { setProfile(u); setName(u.name); });
    budgetsApi.getMe().then(setBudget).catch(() => null);
    budgetRequestsApi.mine().then(setMyRequests).catch(() => null);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password && password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const updated = await usersApi.updateMe({
        name: name !== profile?.name ? name : undefined,
        password: password || undefined,
      });
      setProfile(updated);
      saveUser(updated);
      setPassword('');
      setConfirm('');
      setSuccess('Profile updated successfully.');
    } catch {
      setError('Could not update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasPending = myRequests.some((r) => r.status === 'PENDING');

  const handleSupplementRequest = async () => {
    if (!supplementDesc.trim()) return;
    setSupplementLoading(true);
    try {
      const created = await budgetRequestsApi.create(
        supplementDesc.trim(),
        supplementLimit ? parseFloat(supplementLimit) : undefined,
      );
      setMyRequests((prev) => [created, ...prev]);
      setSupplementSuccess(true);
      setSupplementDesc('');
      setSupplementLimit('');
      setTimeout(() => { setShowSupplementModal(false); setSupplementSuccess(false); }, 2000);
    } catch {
      // silent
    } finally {
      setSupplementLoading(false);
    }
  };

  if (!profile) return <p className="text-sm text-gray-500">Loading...</p>;

  const used = budget ? Number(budget.used_amount) : 0;
  const limit = budget ? Number(budget.annual_limit) : 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const days = budget ? daysUntilReset(budget.updatedAt) : null;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-gray-950">Profile</h1>

      {/* Budget card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Annual Budget — {new Date().getFullYear()}</h2>

        {!budget ? (
          <p className="text-sm text-gray-400">No budget assigned yet. Contact your admin.</p>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-950">
                  €{used.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  <span className="text-base font-normal text-gray-400"> / €{limit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{pct}% used</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Remaining</p>
                <p className="text-lg font-semibold text-gray-800">
                  €{Math.max(0, limit - used).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`${barColor} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Resets on {resetDateStr(budget.updatedAt)}</span>
              {days !== null && (
                <span className="font-medium text-gray-700">{days} day{days !== 1 ? 's' : ''} remaining</span>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => setShowSupplementModal(true)}
          disabled={hasPending}
          className="w-full mt-2 border border-blue-300 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {hasPending ? 'Request Pending...' : 'Request Budget Supplement'}
        </button>

        {myRequests.length > 0 && (
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your requests</p>
            {myRequests.slice(0, 3).map((req) => (
              <div key={req.id} className="flex items-start justify-between gap-2">
                <p className="text-xs text-gray-600 flex-1 truncate">{req.description}</p>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-700'
                }`}>
                  {req.status === 'APPROVED' ? `Approved — €${Number(req.approvedLimit).toLocaleString('en-GB')}` :
                   req.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-950 mb-1">Email</label>
            <input type="text" readOnly value={profile.email}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 cursor-default" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-950 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-950 mb-1">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {password && (
            <div>
              <label className="block text-sm font-medium text-gray-950 mb-1">Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Supplement modal */}
      {showSupplementModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-base font-semibold text-gray-950">Request Budget Supplement</h3>
            <p className="text-sm text-gray-500">Your request will be sent to your manager via email.</p>

            {supplementSuccess ? (
              <p className="text-sm text-green-700 font-medium">Request sent successfully!</p>
            ) : (
              <>
                <textarea
                  value={supplementDesc}
                  onChange={(e) => setSupplementDesc(e.target.value)}
                  placeholder="Explain why you need additional budget..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Requested limit (€) — optional</label>
                  <input
                    type="number" min="0" step="100"
                    value={supplementLimit}
                    onChange={(e) => setSupplementLimit(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setShowSupplementModal(false); setSupplementDesc(''); }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSupplementRequest} disabled={supplementLoading || !supplementDesc.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {supplementLoading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
