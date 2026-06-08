'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { poApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { POCategory, POStatus, PurchaseOrder, UserRole } from '@/types';
import POStatusBadge from '@/components/purchase-orders/POStatusBadge';

function exportToCsv(rows: PurchaseOrder[]) {
  const headers = ['Title', 'Category', 'Amount (€)', 'Status', 'Created By', 'Date'];
  const lines = rows.map((po) => [
    `"${po.title.replace(/"/g, '""')}"`,
    po.category,
    Number(po.amount).toFixed(2),
    po.status,
    po.createdBy?.name ?? '',
    new Date(po.createdAt).toLocaleDateString('en-GB'),
  ].join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: POStatus.PENDING_MANAGER, label: 'Pending Manager' },
  { value: POStatus.PENDING_IT, label: 'Pending IT' },
  { value: POStatus.PENDING_FINANCE, label: 'Pending Finance' },
  { value: POStatus.NEEDS_REWORK, label: 'Needs Rework' },
  { value: POStatus.INVOICED, label: 'Invoiced' },
  { value: POStatus.PERMANENTLY_REJECTED, label: 'Rejected' },
];

const categoryOptions = [
  { value: '', label: 'All categories' },
  { value: POCategory.SERVICES, label: 'Services' },
  { value: POCategory.OFFICE_SUPPLIES, label: 'Office Supplies' },
  { value: POCategory.IT_EQUIPMENT, label: 'IT Equipment' },
];

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const user = getUser();

  useEffect(() => {
    setLoading(true);
    poApi.list(statusFilter || undefined, categoryFilter || undefined)
      .then(setPos)
      .catch(() => setError('Could not load orders.'))
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Purchase Orders</h1>
        <div className="flex items-center gap-2">
          {user?.role === UserRole.FINANCE && pos.length > 0 && (
            <button
              onClick={() => exportToCsv(pos)}
              className="text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export CSV
            </button>
          )}
          <Link
            href="/purchase-orders/new"
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New PO
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-950 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-950 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(statusFilter || categoryFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setCategoryFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
        )}
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
                  <td className="px-4 py-3 text-gray-600">{po.category.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">€{Number(po.amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><POStatusBadge status={po.status} /></td>
                  <td className="px-4 py-3 text-gray-600">{po.createdBy?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(po.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:underline text-xs font-medium">
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
