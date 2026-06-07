import { POStatus } from '@/types';

const config: Record<POStatus, { label: string; className: string }> = {
  [POStatus.PENDING_MANAGER]:    { label: 'Pending Manager',    className: 'bg-yellow-100 text-yellow-800' },
  [POStatus.PENDING_IT]:         { label: 'Pending IT',         className: 'bg-blue-100 text-blue-800' },
  [POStatus.PENDING_FINANCE]:    { label: 'Pending Finance',    className: 'bg-purple-100 text-purple-800' },
  [POStatus.NEEDS_REWORK]:       { label: 'Needs Rework',       className: 'bg-red-100 text-red-800' },
  [POStatus.INVOICED]:           { label: 'Invoiced',           className: 'bg-green-100 text-green-800' },
  [POStatus.PERMANENTLY_REJECTED]: { label: 'Rejected',         className: 'bg-gray-100 text-gray-600' },
};

export default function POStatusBadge({ status }: { status: POStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
