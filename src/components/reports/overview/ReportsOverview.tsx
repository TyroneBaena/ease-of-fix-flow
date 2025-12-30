import { useOverviewStats } from './hooks/useOverviewStats';
import RequestTrendsChart from './RequestTrendsChart';
import TopPropertiesChart from './TopPropertiesChart';
import TimeBasedInsights from './TimeBasedInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-[280px] w-full" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-[280px]" />
      <Skeleton className="h-[280px]" />
    </div>
  </div>
);

const ReportsOverview = () => {
  const { loading, error, monthlyTrends, topProperties, timeInsights } = useOverviewStats();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const hasData = monthlyTrends.some(t => t.requests > 0);

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-muted-foreground max-w-md">
            There are no maintenance requests in the last 6 months. 
            Reports will appear here once requests are submitted.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Full Width Trend Chart */}
      <RequestTrendsChart data={monthlyTrends} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPropertiesChart data={topProperties} />
        <TimeBasedInsights data={timeInsights} />
      </div>
    </div>
  );
};

export default ReportsOverview;
