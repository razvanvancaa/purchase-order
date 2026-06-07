import { POHistory, POAction } from '@/types';

const actionLabel: Record<POAction, string> = {
  [POAction.SUBMITTED]: 'Submitted',
  [POAction.APPROVED]: 'Approved',
  [POAction.REJECTED]: 'Rejected',
  [POAction.HARD_REJECTED]: 'Respins definitiv',
  [POAction.REWORKED]: 'Resubmitted',
  [POAction.INVOICED]: 'Invoiced',
};

const actionColor: Record<POAction, string> = {
  [POAction.SUBMITTED]: 'bg-blue-500',
  [POAction.APPROVED]: 'bg-green-500',
  [POAction.REJECTED]: 'bg-red-500',
  [POAction.HARD_REJECTED]: 'bg-gray-800',
  [POAction.REWORKED]: 'bg-yellow-500',
  [POAction.INVOICED]: 'bg-purple-500',
};

export default function POTimeline({ history }: { history: POHistory[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No events recorded.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-6">
      {history.map((entry) => (
        <li key={entry.id} className="ml-6">
          <span className={`absolute -left-1.5 w-3 h-3 rounded-full ${actionColor[entry.action]}`} />
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-gray-900">{actionLabel[entry.action]}</span>
            <span className="text-xs text-gray-400">
              {new Date(entry.timestamp).toLocaleString('ro-RO')}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            by <span className="font-medium">{entry.performedBy?.name || entry.performedBy?.email || '—'}</span>
            {' · '}
            {entry.fromStatus.replace(/_/g, ' ')} → {entry.toStatus.replace(/_/g, ' ')}
          </p>
          {entry.comment && (
            <p className="mt-1 text-xs text-gray-600 italic">"{entry.comment}"</p>
          )}
        </li>
      ))}
    </ol>
  );
}
