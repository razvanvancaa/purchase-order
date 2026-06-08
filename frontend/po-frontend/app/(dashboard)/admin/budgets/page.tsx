'use client';

import { useEffect, useState } from 'react';
import { budgetsApi, usersApi } from '@/lib/api';
import { Budget, User } from '@/types';

export default function ManageBudgetsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([usersApi.list(), budgetsApi.getAll()])
      .then(([usersData, budgetsData]) => {
        setUsers(usersData);
        setBudgets(budgetsData);
        const initial: Record<string, string> = {};
        usersData.forEach((u) => {
          const b = budgetsData.find((b) => b.user?.id === u.id);
          initial[u.id] = b ? String(b.annual_limit) : '';
        });
        setLimits(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (userId: string) => {
    const val = parseFloat(limits[userId]);
    if (isNaN(val) || val <= 0) return;
    setSaving((s) => ({ ...s, [userId]: true }));
    try {
      const updated = await budgetsApi.set(userId, val);
      setBudgets((prev) => {
        const idx = prev.findIndex((b) => b.user?.id === userId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
      setSaved((s) => ({ ...s, [userId]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [userId]: false })), 2000);
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
    }
  };

  const getBudget = (userId: string) => budgets.find((b) => b.user?.id === userId);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-950">Manage Annual Budgets</h1>
      <p className="text-sm text-gray-500">Set the annual spending limit for each employee. Leave blank to remove the cap.</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Used ({new Date().getFullYear()})</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Annual Limit (€)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const budget = getBudget(user.id);
              return (
                <tr key={user.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-950">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{user.role.toLowerCase()}</td>
                  <td className="px-4 py-3 text-gray-950">
                    {budget ? `€${Number(budget.used_amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={limits[user.id] ?? ''}
                      onChange={(e) => setLimits((l) => ({ ...l, [user.id]: e.target.value }))}
                      placeholder="No limit"
                      className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSave(user.id)}
                      disabled={saving[user.id]}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saved[user.id] ? 'Saved ✓' : saving[user.id] ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
