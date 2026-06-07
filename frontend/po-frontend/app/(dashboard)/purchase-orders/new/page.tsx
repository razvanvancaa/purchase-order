'use client';

import { useRouter } from 'next/navigation';
import POForm from '@/components/purchase-orders/POForm';
import { poApi } from '@/lib/api';
import { CreatePOPayload, UpdatePOPayload } from '@/types';

export default function NewPurchaseOrderPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreatePOPayload | UpdatePOPayload) => {
    const po = await poApi.create(data as CreatePOPayload);
    router.push(`/purchase-orders/${po.id}`);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">New Purchase Order</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <POForm onSubmit={handleSubmit} submitLabel="Create PO" />
      </div>
    </div>
  );
}
