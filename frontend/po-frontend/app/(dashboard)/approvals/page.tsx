'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { poApi } from '@/lib/api';
import { ApprovalDecision, POAction } from '@/types';

const actionLabel: Record<POAction.APPROVED | POAction.REJECTED | POAction.HARD_REJECTED, string> = {
  [POAction.APPROVED]: 'Approved',
  [POAction.REJECTED]: 'Rejected',
  [POAction.HARD_REJECTED]: 'Permanently Rejected',
};

const actionStyle: Record<POAction.APPROVED | POAction.REJECTED | POAction.HARD_REJECTED, string> = {
  [POAction.APPROVED]: 'bg-green-100 text-green-800',
  [POAction.REJECTED]: 'bg-red-100 text-red-700',
  [POAction.HARD_REJECTED]: 'bg-gray-200 text-gray-800',
};

const categoryLabel: Record<string, string> = {
  SERVICES: 'Services',
  OFFICE_SUPPLIES: 'Office Supplies',
  IT_EQUIPMENT: 'IT Equipment',
};

export default function ApprovalsPage() {
  const [decisions, setDecisions] = useState<ApprovalDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    poApi.myApprovals()
      .then(setDecisions)
      .catch(() => setError('Could not load decisions.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Approval History</h1>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && decisions.length === 0 && (
        <p className="text-sm text-gray-500">You haven't made any approval decisions yet.</p>
      )}

      {!loading && decisions.length > 0 && (
        <div className="space-y-3">
          {decisions.map((d) => {
            const action = d.action as POAction.APPROVED | POAction.REJECTED | POAction.HARD_REJECTED;
            return (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/purchase-orders/${d.purchaseOrder.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline truncate"
                      >
                        {d.purchaseOrder.title}
                      </Link>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${actionStyle[action]}`}>
                        {actionLabel[action]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {categoryLabel[d.purchaseOrder.category] ?? d.purchaseOrder.category}
                      {' · '}
                      €{Number(d.purchaseOrder.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      {' · '}
                      created by <span className="font-medium">{d.purchaseOrder.createdBy?.name || d.purchaseOrder.createdBy?.email || '—'}</span>
                    </p>
                    {d.comment && (
                      <p className="text-xs text-gray-600 italic mt-1">"{d.comment}"</p>
                    )}
                  </div>
                  <time className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {new Date(d.timestamp).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
