
import { Inbox } from 'lucide-react';

export const EmptyState = () => {
  return (
    <div className="text-center py-12">
      <Inbox className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-semibold text-gray-900">No requests</h3>
      <p className="mt-1 text-sm text-gray-500">
        No maintenance requests found for this status.
      </p>
    </div>
  );
};
