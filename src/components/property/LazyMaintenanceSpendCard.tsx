import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';

// Lazy load the actual component
const MaintenanceSpendCard = React.lazy(() => 
  import('./MaintenanceSpendCard').then(module => ({ 
    default: module.MaintenanceSpendCard 
  }))
);

interface LazyMaintenanceSpendCardProps {
  propertyId: string;
}

// Enhanced loading skeleton that's more visually obvious
const MaintenanceSpendSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-gray-300 animate-pulse" />
        <Skeleton className="h-6 w-48" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const LazyMaintenanceSpendCard: React.FC<LazyMaintenanceSpendCardProps> = ({ propertyId }) => {
  return (
    <Suspense fallback={<MaintenanceSpendSkeleton />}>
      <MaintenanceSpendCard propertyId={propertyId} />
    </Suspense>
  );
};