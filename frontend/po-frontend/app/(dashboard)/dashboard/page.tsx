'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { budgetsApi, poApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Budget, PurchaseOrder, POStatus, UserRole } from '@/types';


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
  const [allPos, setAllPos] = useState<PurchaseOrder[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const promises: Promise<void>[] = [
      poApi.list().then(setPos).catch(() => setError('Could not load data.')),
    ];
    if (role === UserRole.FINANCE) {
      promises.push(
        budgetsApi.getAll().then(setAllBudgets).catch(() => {}),
        poApi.allForReport().then(setAllPos).catch(() => {}),
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
              value={countByStatus(POStatus.PENDING_FINANCE)}
              sub="orders at Finance stage"
            />
            <StatCard
              label="Employees tracked"
              value={allBudgets.length}
              sub="with annual budget"
            />
            <StatCard
              label="Exceeded budget"
              value={allBudgets.filter((b) => {
                const spent = allPos
                  .filter((p) => p.createdBy?.id === b.user?.id && p.status === POStatus.INVOICED)
                  .reduce((s, p) => s + Number(p.amount), 0);
                return spent > Number(b.annual_limit);
              }).length}
              sub="users over their limit"
            />
          </div>

          {/* Team budget overview */}
          {allBudgets.length > 0 && (() => {
            const teamTotal = allBudgets.reduce((s, b) => s + Number(b.annual_limit), 0);
            const teamInvoiced = allPos
              .filter((p) => p.status === POStatus.INVOICED)
              .reduce((s, p) => s + Number(p.amount), 0);
            const teamPipeline = allPos
              .filter((p) => p.status === POStatus.PENDING_FINANCE || p.status === POStatus.PENDING_IT || p.status === POStatus.PENDING_MANAGER)
              .reduce((s, p) => s + Number(p.amount), 0);
            const teamCommitted = teamInvoiced + teamPipeline;
            const overTeam = teamCommitted > teamTotal;
            const invoicedPct = teamTotal > 0 ? Math.min((teamInvoiced / teamTotal) * 100, 100) : 0;
            const pipelinePct = teamTotal > 0 ? Math.min((teamPipeline / teamTotal) * 100, 100 - invoicedPct) : 0;
            const remaining = Math.max(teamTotal - teamCommitted, 0);
            return (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">Team budget ({new Date().getFullYear()})</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Total allocated</p>
                      <p className="text-lg font-semibold text-gray-900">
                        €{teamTotal.toLocaleString('en-GB', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Invoiced</p>
                      <p className="text-lg font-semibold text-blue-600">
                        €{teamInvoiced.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">In pipeline</p>
                      <p className="text-lg font-semibold text-amber-500">
                        €{teamPipeline.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Remaining</p>
                      <p className={`text-lg font-semibold ${overTeam ? 'text-red-600' : 'text-green-600'}`}>
                        €{remaining.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${invoicedPct}%` }} />
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${pipelinePct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Invoiced</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />In pipeline</span>
                    </div>
                    <span>{overTeam ? 'Over budget' : `${(((teamCommitted) / teamTotal) * 100).toFixed(1)}% committed`}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {allBudgets.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Budget per employee</h2>
              {allBudgets.map((b) => {
                const limit = Number(b.annual_limit);
                const invoiced = allPos
                  .filter((p) => p.createdBy?.id === b.user?.id && p.status === POStatus.INVOICED)
                  .reduce((s, p) => s + Number(p.amount), 0);
                const pipeline = allPos
                  .filter((p) => p.createdBy?.id === b.user?.id &&
                    (p.status === POStatus.PENDING_FINANCE || p.status === POStatus.PENDING_IT || p.status === POStatus.PENDING_MANAGER))
                  .reduce((s, p) => s + Number(p.amount), 0);
                const committed = invoiced + pipeline;
                const overLimit = committed > limit;
                const invoicedPct = limit > 0 ? Math.min((invoiced / limit) * 100, 100) : 0;
                const pipelinePct = limit > 0 ? Math.min((pipeline / limit) * 100, 100 - invoicedPct) : 0;
                return (
                  <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{b.user?.name || b.user?.email}</span>
                      <span className={`font-semibold ${overLimit ? 'text-red-600' : 'text-gray-700'}`}>
                        €{committed.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        <span className="font-normal text-gray-400"> / €{limit.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</span>
                        {overLimit && <span className="ml-1 text-xs font-normal text-red-500">— exceeded</span>}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${invoicedPct}%` }} />
                      <div className="h-full bg-amber-400 transition-all" style={{ width: `${pipelinePct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Invoiced: €{invoiced.toLocaleString('en-GB', { minimumFractionDigits: 2 })} · Pipeline: €{pipeline.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                      <span>{((committed / limit) * 100).toFixed(1)}% used</span>
                    </div>
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
