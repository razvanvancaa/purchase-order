'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { poApi } from '@/lib/api';
import { PurchaseOrder } from '@/types';
import POStatusBadge from '@/components/purchase-orders/POStatusBadge';

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    poApi.list()
      .then(setPos)
      .catch(() => setError('Could not load orders.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Purchase Orders</h1>
        <Link
          href="/purchase-orders/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New PO
        </Link>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && pos.length === 0 && (
        <div className="text-sm text-gray-500">No orders found.</div>
      )}

      {!loading && pos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created by</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{po.title}</td>
                  <td className="px-4 py-3 text-gray-600">{po.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">€{Number(po.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <POStatusBadge status={po.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{po.createdBy?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(po.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      View
                    </Link>
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
