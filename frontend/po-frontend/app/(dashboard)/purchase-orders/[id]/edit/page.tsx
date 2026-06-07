'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { poApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { PurchaseOrder, POStatus, UpdatePOPayload } from '@/types';
import POForm from '@/components/purchase-orders/POForm';

export default function EditPurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = getUser();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    poApi.get(id)
      .then((data) => {
        if (data.status !== POStatus.NEEDS_REWORK || data.createdBy?.id !== user?.id) {
          router.replace(`/purchase-orders/${id}`);
          return;
        }
        setPo(data);
      })
      .catch(() => setError('Could not load order.'))
      .finally(() => setLoading(false));
  }, [id, user?.id, router]);

  const handleSubmit = async (data: UpdatePOPayload) => {
    await poApi.update(id, data);
    router.push(`/purchase-orders/${id}`);
  };

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!po) return null;

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <Link href={`/purchase-orders/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to order
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Edit Purchase Order</h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
        <p className="text-sm text-yellow-800">
          This order was sent back for rework. Update the details and resubmit to restart the approval process.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <POForm
          initial={{
            title: po.title,
            description: po.description,
            amount: po.amount,
            category: po.category,
          }}
          onSubmit={handleSubmit}
          submitLabel="Resubmit"
        />
      </div>
    </div>
  );
}
