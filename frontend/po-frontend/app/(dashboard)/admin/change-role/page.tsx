'use client';

import { useState } from 'react';
import { usersApi } from '@/lib/api';
import { User, UserRole } from '@/types';

const assignableRoles: { value: UserRole; label: string }[] = [
  { value: UserRole.MANAGER, label: 'Manager' },
  { value: UserRole.IT, label: 'IT Representative' },
  { value: UserRole.FINANCE, label: 'Finance' },
  { value: UserRole.REQUESTER, label: 'Requester' },
];

const roleLabel: Record<UserRole, string> = {
  [UserRole.REQUESTER]: 'Requester',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.IT]: 'IT Representative',
  [UserRole.FINANCE]: 'Finance',
  [UserRole.ADMIN]: 'Admin',
};

const CONFIRM_WORD = 'CHANGEROLE';

export default function ChangeRolePage() {
  const [email, setEmail] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MANAGER);
  const [confirmation, setConfirmation] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleEmailBlur = async () => {
    if (!email) return;
    setFoundUser(null);
    setLookupError('');
    setLookingUp(true);
    try {
      const users = await usersApi.list();
      const target = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (target) {
        setFoundUser(target);
      } else {
        setLookupError('No user found with this email.');
      }
    } catch {
      setLookupError('Error looking up user.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async () => {
    setSuccess('');
    setError('');

    if (confirmation !== CONFIRM_WORD) {
      setError(`Wrong confirmation word. You must type exactly "${CONFIRM_WORD}".`);
      return;
    }

    if (!foundUser) {
      setError('No user found with this email.');
      return;
    }

    setLoading(true);
    try {
      const updated = await usersApi.updateRole(foundUser.id, role);
      setSuccess(`${updated.name || updated.email}'s role has been changed to ${roleLabel[updated.role]}.`);
      setEmail('');
      setFoundUser(null);
      setConfirmation('');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold text-gray-950">Change Role</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-950 mb-1">
              Employee email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFoundUser(null); setLookupError(''); }}
              onBlur={handleEmailBlur}
              placeholder="employee@company.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {lookingUp && <p className="text-xs text-gray-500 mt-1">Searching...</p>}
            {lookupError && <p className="text-xs text-red-600 mt-1">{lookupError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-950 mb-1">
              Current role
            </label>
            <input
              type="text"
              readOnly
              value={foundUser ? roleLabel[foundUser.role] : '—'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-950 bg-gray-50 cursor-default"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-950 mb-1">
              New role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {assignableRoles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-950 mb-1">
              <span className="flex items-center gap-1.5">
                Confirmation
                <span
                  className="relative inline-flex"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <span className="w-4 h-4 rounded-full bg-gray-300 text-gray-700 text-xs flex items-center justify-center cursor-default select-none font-bold">
                    i
                  </span>
                  {showTooltip && (
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap z-10 shadow-lg">
                      Type <span className="font-mono font-bold">{CONFIRM_WORD}</span> to confirm
                    </span>
                  )}
                </span>
              </span>
            </label>
            <input
              type="text"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Type the confirmation word"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 font-mono placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}

          <button
            type="submit"
            disabled={loading || !!lookupError || lookingUp}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : 'Change Role'}
          </button>
        </form>
      </div>
    </div>
  );
}
