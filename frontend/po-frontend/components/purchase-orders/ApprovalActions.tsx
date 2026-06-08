'use client';

import { useState } from 'react';
import { poApi } from '@/lib/api';
import { PurchaseOrder, POStatus, UserRole } from '@/types';

const canApprove: Partial<Record<POStatus, UserRole>> = {
  [POStatus.PENDING_MANAGER]: UserRole.MANAGER,
  [POStatus.PENDING_IT]: UserRole.IT,
  [POStatus.PENDING_FINANCE]: UserRole.FINANCE,
};

type RejectMode = 'soft' | 'hard';

interface ApprovalActionsProps {
  po: PurchaseOrder;
  userRole: UserRole;
  userId: string;
  onAction: () => void;
}

export default function ApprovalActions({ po, userRole, userId, onAction }: ApprovalActionsProps) {
  const [comment, setComment] = useState('');
  const [rejectMode, setRejectMode] = useState<RejectMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allowedRole = canApprove[po.status];
  if (!allowedRole || allowedRole !== userRole) return null;

  const isFinance = userRole === UserRole.FINANCE;

  const isSelfApprovalBlocked =
    (isFinance || userRole === UserRole.IT) && po.createdBy?.id === userId;

  if (isSelfApprovalBlocked) {
    return (
      <p className="text-sm text-gray-500 italic">
        You created this order — another {isFinance ? 'Finance' : 'IT'} member must approve or reject it.
      </p>
    );
  }

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    try {
      await poApi.approve(po.id);
      onAction();
    } catch {
      setError('Approval failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (rejectMode === 'hard') {
        await poApi.hardReject(po.id, { comment });
      } else {
        await poApi.reject(po.id, { comment });
      }
      onAction();
    } catch {
      setError('Rejection failed.');
    } finally {
      setLoading(false);
    }
  };

  const cancelReject = () => { setRejectMode(null); setComment(''); };

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!rejectMode ? (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : isFinance ? 'Approve & Invoice' : 'Approve'}
          </button>
          <button
            onClick={() => setRejectMode('soft')}
            disabled={loading}
            className="bg-red-50 text-red-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
          {isFinance && (
            <button
              onClick={() => setRejectMode('hard')}
              disabled={loading}
              className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              Permanent Rejection
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rejectMode === 'hard' && (
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Permanent rejection — monthly budget exceeded
            </p>
          )}
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={rejectMode === 'hard' ? 'Reason for permanent rejection...' : 'Reason for rejection...'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={loading || !comment.trim()}
              className={`text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors ${
                rejectMode === 'hard'
                  ? 'bg-gray-800 hover:bg-gray-900'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
            <button
              onClick={cancelReject}
              disabled={loading}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
