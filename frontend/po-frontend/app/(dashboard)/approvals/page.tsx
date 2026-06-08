'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { poApi } from '@/lib/api';
import { ApprovalDecision, POAction } from '@/types';

type SortField = 'createdBy' | 'date' | 'status' | 'amount';
type SortDir = 'asc' | 'desc';

const actionLabel: Record<string, string> = {
  [POAction.APPROVED]: 'Approved',
  [POAction.REJECTED]: 'Rejected',
  [POAction.HARD_REJECTED]: 'Perm. Rejected',
};

const actionStyle: Record<string, string> = {
  [POAction.APPROVED]: 'bg-green-100 text-green-800',
  [POAction.REJECTED]: 'bg-red-100 text-red-700',
  [POAction.HARD_REJECTED]: 'bg-gray-200 text-gray-700',
};

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1 text-blue-600">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function ApprovalsPage() {
  const [decisions, setDecisions] = useState<ApprovalDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    poApi.myApprovals()
      .then(setDecisions)
      .catch(() => setError('Could not load decisions.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...decisions].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'createdBy') {
      cmp = (a.purchaseOrder.createdBy?.name ?? '').localeCompare(b.purchaseOrder.createdBy?.name ?? '');
    } else if (sortField === 'date') {
      cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortField === 'status') {
      cmp = a.action.localeCompare(b.action);
    } else if (sortField === 'amount') {
      cmp = Number(a.purchaseOrder.amount) - Number(b.purchaseOrder.amount);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const thClass = (field: SortField) =>
    `px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 transition-colors ${sortField === field ? 'text-blue-600' : ''}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Approval History</h1>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && decisions.length === 0 && (
        <p className="text-sm text-gray-500">You haven't made any approval decisions yet.</p>
      )}

      {!loading && sorted.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Order
                </th>
                <th className={thClass('createdBy')} onClick={() => handleSort('createdBy')}>
                  Created By <SortIcon field="createdBy" active={sortField === 'createdBy'} dir={sortDir} />
                </th>
                <th className={thClass('amount')} onClick={() => handleSort('amount')}>
                  Amount <SortIcon field="amount" active={sortField === 'amount'} dir={sortDir} />
                </th>
                <th className={thClass('status')} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" active={sortField === 'status'} dir={sortDir} />
                </th>
                <th className={thClass('date')} onClick={() => handleSort('date')}>
                  Date <SortIcon field="date" active={sortField === 'date'} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/purchase-orders/${d.purchaseOrder.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {d.purchaseOrder.title}
                    </Link>
                    {d.comment && (
                      <p className="text-xs text-gray-400 italic mt-0.5 truncate max-w-xs">"{d.comment}"</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.purchaseOrder.createdBy?.name || d.purchaseOrder.createdBy?.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    €{Number(d.purchaseOrder.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionStyle[d.action] ?? 'bg-gray-100 text-gray-700'}`}>
                      {actionLabel[d.action] ?? d.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(d.timestamp).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
