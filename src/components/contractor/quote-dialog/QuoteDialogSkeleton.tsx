
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const QuoteDialogSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">Issue Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <Skeleton className="h-4 w-4 mt-1" />
            <div className="space-y-2 flex-grow">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Skeleton className="h-4 w-4 mt-1" />
            <div className="space-y-2 flex-grow">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
};
