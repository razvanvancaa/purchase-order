'use client';

import { useState } from 'react';
import { POCategory, CreatePOPayload, UpdatePOPayload } from '@/types';

const categoryLabels: Record<POCategory, string> = {
  [POCategory.SERVICES]: 'Services',
  [POCategory.OFFICE_SUPPLIES]: 'Office Supplies',
  [POCategory.IT_EQUIPMENT]: 'IT Equipment',
};

interface POFormProps {
  initial?: Partial<CreatePOPayload>;
  onSubmit: (data: CreatePOPayload | UpdatePOPayload) => Promise<void>;
  submitLabel?: string;
}

export default function POForm({ initial, onSubmit, submitLabel = 'Save' }: POFormProps) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    amount: initial?.amount?.toString() ?? '',
    category: initial?.category ?? POCategory.SERVICES,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        title: form.title,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        category: form.category,
      });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Laptops for the dev team"
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Additional details..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (€)</label>
          <input
            type="number"
            required
            min={0.01}
            step={0.01}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as POCategory })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {Object.values(POCategory).map((cat) => (
              <option key={cat} value={cat}>{categoryLabels[cat]}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
