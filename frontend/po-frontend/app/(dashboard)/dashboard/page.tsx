'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { poApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { MonthlySpending, PurchaseOrder, POStatus, UserRole } from '@/types';

const MONTHLY_CAP = 2000;

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

const statusLabel: Partial<Record<POStatus, string>> = {
  [POStatus.PENDING_MANAGER]: 'Pending Manager',
  [POStatus.PENDING_IT]: 'Pending IT',
  [POStatus.PENDING_FINANCE]: 'Pending Finance',
  [POStatus.NEEDS_REWORK]: 'Needs Rework',
  [POStatus.INVOICED]: 'Invoiced',
  [POStatus.PERMANENTLY_REJECTED]: 'Permanently Rejected',
};

export default function DashboardPage() {
  const user = getUser();
  const role = user?.role;

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [spendings, setSpendings] = useState<MonthlySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const promises: Promise<void>[] = [
      poApi.list().then(setPos).catch(() => setError('Could not load data.')),
    ];
    if (role === UserRole.FINANCE) {
      promises.push(
        poApi.monthlySpendings().then(setSpendings).catch(() => {}),
      );
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, [role]);

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  const countByStatus = (status: POStatus) => pos.filter((p) => p.status === status).length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      {/* REQUESTER */}
      {role === UserRole.REQUESTER && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Welcome, <span className="font-medium">{user?.name || user?.email}</span>.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Pending" value={
              countByStatus(POStatus.PENDING_MANAGER) +
              countByStatus(POStatus.PENDING_IT) +
              countByStatus(POStatus.PENDING_FINANCE)
            } />
            <StatCard label="Needs Rework" value={countByStatus(POStatus.NEEDS_REWORK)} />
            <StatCard label="Invoiced" value={countByStatus(POStatus.INVOICED)} />
            <StatCard label="Permanently Rejected" value={countByStatus(POStatus.PERMANENTLY_REJECTED)} />
            <StatCard label="Total orders" value={pos.length} />
          </div>
          {countByStatus(POStatus.NEEDS_REWORK) > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-800">
                You have {countByStatus(POStatus.NEEDS_REWORK)} order(s) that need rework.
              </p>
              <Link href="/purchase-orders" className="text-xs text-yellow-700 hover:underline mt-1 inline-block">
                View orders →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* MANAGER */}
      {role === UserRole.MANAGER && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Awaiting your approval"
              value={pos.length}
              sub="orders at Manager stage"
            />
          </div>
          {pos.length > 0 && (
            <Link href="/purchase-orders" className="inline-block text-sm font-medium text-blue-600 hover:underline">
              Review orders →
            </Link>
          )}
          <div className="pt-2">
            <Link href="/approvals" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
              View your decision history →
            </Link>
          </div>
        </div>
      )}

      {/* IT */}
      {role === UserRole.IT && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Awaiting your approval"
              value={pos.length}
              sub="orders at IT stage"
            />
          </div>
          {pos.length > 0 && (
            <Link href="/purchase-orders" className="inline-block text-sm font-medium text-blue-600 hover:underline">
              Review orders →
            </Link>
          )}
          <div className="pt-2">
            <Link href="/approvals" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
              View your decision history →
            </Link>
          </div>
        </div>
      )}

      {/* FINANCE */}
      {role === UserRole.FINANCE && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Pending Finance"
              value={pos.length}
              sub="orders at Finance stage"
            />
            <StatCard
              label="Requesters this month"
              value={spendings.length}
            />
            <StatCard
              label="Exceeded cap"
              value={spendings.filter((s) => s.total > MONTHLY_CAP).length}
              sub={`Cap: €${MONTHLY_CAP.toLocaleString()}`}
            />
          </div>

          {spendings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Monthly spending per requester</h2>
                <span className="text-xs text-gray-400">Cap: €{MONTHLY_CAP.toLocaleString()}</span>
              </div>
              {spendings.map((s) => {
                const pct = Math.min((s.total / MONTHLY_CAP) * 100, 100);
                const overCap = s.total > MONTHLY_CAP;
                return (
                  <div key={s.requesterId} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{s.name || s.email}</span>
                      <span className={`font-semibold ${overCap ? 'text-red-600' : 'text-gray-700'}`}>
                        €{s.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        {overCap && <span className="ml-1 text-xs font-normal">— exceeded</span>}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${overCap ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{pct.toFixed(1)}% of monthly cap</p>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Link href="/approvals" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
              View your decision history →
            </Link>
          </div>
        </div>
      )}

      {/* ADMIN */}
      {role === UserRole.ADMIN && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total orders" value={pos.length} />
            {Object.values(POStatus).map((s) => (
              <StatCard key={s} label={statusLabel[s] ?? s} value={countByStatus(s)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
