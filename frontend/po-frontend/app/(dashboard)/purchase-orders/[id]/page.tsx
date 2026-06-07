'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { poApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { PurchaseOrder, POHistory, POStatus, UserRole } from '@/types';
import POStatusBadge from '@/components/purchase-orders/POStatusBadge';
import POTimeline from '@/components/purchase-orders/POTimeline';
import ApprovalActions from '@/components/purchase-orders/ApprovalActions';

const categoryLabel: Record<string, string> = {
  SERVICES: 'Services',
  OFFICE_SUPPLIES: 'Office Supplies',
  IT_EQUIPMENT: 'IT Equipment',
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [history, setHistory] = useState<POHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = getUser();

  const fetchData = useCallback(async () => {
    try {
      const [poData, historyData] = await Promise.all([
        poApi.get(id),
        poApi.history(id),
      ]);
      setPo(poData);
      setHistory(historyData);
    } catch {
      setError('Could not load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canEdit =
    po?.status === POStatus.NEEDS_REWORK &&
    user?.id === po?.createdBy?.id;

  const canInvoice =
    po?.status === POStatus.PENDING_FINANCE &&
    user?.role === UserRole.FINANCE;

  const handleInvoice = async () => {
    if (!po) return;
    await poApi.invoice(po.id);
    fetchData();
  };

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!po) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/purchase-orders" className="text-sm text-gray-500 hover:text-gray-700">
            ← Purchase Orders
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">{po.title}</h1>
        </div>
        {canEdit && (
          <Link
            href={`/purchase-orders/${po.id}/edit`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <POStatusBadge status={po.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-0.5">Category</p>
            <p className="font-medium text-gray-900">{categoryLabel[po.category] ?? po.category}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Amount</p>
            <p className="font-medium text-gray-900">€{Number(po.amount).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Created by</p>
            <p className="font-medium text-gray-900">{po.createdBy?.name || po.createdBy?.email}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Created at</p>
            <p className="font-medium text-gray-900">
              {new Date(po.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>

        {po.description && (
          <div>
            <p className="text-gray-500 text-sm mb-0.5">Description</p>
            <p className="text-sm text-gray-700">{po.description}</p>
          </div>
        )}
      </div>

      {user && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Actions</h2>
          <ApprovalActions po={po} userRole={user.role} userId={user.id} onAction={fetchData} />
          {canInvoice && (
            <button
              onClick={handleInvoice}
              className="bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Mark as Invoiced
            </button>
          )}
          {!canInvoice && po.status === POStatus.INVOICED && (
            <p className="text-sm text-green-700 font-medium">This order has been invoiced.</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">History</h2>
        <POTimeline history={history} />
      </div>
    </div>
  );
}
