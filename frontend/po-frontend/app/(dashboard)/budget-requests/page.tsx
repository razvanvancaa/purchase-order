'use client';

import { useEffect, useState } from 'react';
import { budgetRequestsApi } from '@/lib/api';
import { BudgetRequest } from '@/types';

const statusBadge: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function BudgetRequestsPage() {
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    budgetRequestsApi.all()
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async () => {
    if (!approveId || !newLimit) return;
    setSaving(true);
    try {
      const updated = await budgetRequestsApi.approve(approveId, parseFloat(newLimit));
      setRequests((prev) => prev.map((r) => r.id === approveId ? updated : r));
      setApproveId(null);
      setNewLimit('');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !comment.trim()) return;
    setSaving(true);
    try {
      const updated = await budgetRequestsApi.reject(rejectId, comment.trim());
      setRequests((prev) => prev.map((r) => r.id === rejectId ? updated : r));
      setRejectId(null);
      setComment('');
    } finally {
      setSaving(false);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING');
  const reviewed = requests.filter((r) => r.status !== 'PENDING');

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-950">Budget Supplement Requests</h1>

      {requests.length === 0 && (
        <p className="text-sm text-gray-400">No requests yet.</p>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Pending ({pending.length})</h2>
          {pending.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-950">{req.requester.name}</p>
                  <p className="text-xs text-gray-500">{req.requester.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">Pending</span>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">{req.description}</p>
              {req.requestedLimit && (
                <p className="text-sm text-gray-600">Requested limit: <strong>€{Number(req.requestedLimit).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong></p>
              )}
              <p className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleString('en-GB')}</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setApproveId(req.id); setRejectId(null); }}
                  className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => { setRejectId(req.id); setApproveId(null); }}
                  className="px-4 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
              </div>

              {approveId === req.id && (
                <div className="pt-2 space-y-2 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700">Set new annual limit (€)</label>
                  <input
                    type="number" min="0" step="100"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    placeholder={req.requestedLimit ? String(req.requestedLimit) : 'e.g. 5000'}
                    className="w-48 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleApprove} disabled={saving || !newLimit}
                      className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {saving ? 'Saving...' : 'Confirm Approve'}
                    </button>
                    <button onClick={() => { setApproveId(null); setNewLimit(''); }}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {rejectId === req.id && (
                <div className="pt-2 space-y-2 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700">Reason for rejection</label>
                  <textarea
                    value={comment} onChange={(e) => setComment(e.target.value)}
                    rows={2} placeholder="Explain why..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleReject} disabled={saving || !comment.trim()}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {saving ? 'Saving...' : 'Confirm Reject'}
                    </button>
                    <button onClick={() => { setRejectId(null); setComment(''); }}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">History</h2>
          {reviewed.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 opacity-80">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-950">{req.requester.name}</p>
                  <p className="text-xs text-gray-500">{req.requester.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[req.status]}`}>
                  {req.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{req.description}</p>
              {req.status === 'APPROVED' && req.approvedLimit && (
                <p className="text-sm text-green-700">New limit: <strong>€{Number(req.approvedLimit).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong></p>
              )}
              {req.status === 'REJECTED' && req.comment && (
                <p className="text-sm text-red-600">Reason: {req.comment}</p>
              )}
              {req.reviewedBy && (
                <p className="text-xs text-gray-400">Reviewed by {req.reviewedBy.name} · {new Date(req.updatedAt).toLocaleString('en-GB')}</p>
              )}
            </div>
          ))}
        </section>
      )}

    </div>
  );
}
