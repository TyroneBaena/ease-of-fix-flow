
import React from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { RequestsTable } from '@/components/contractor/requests/RequestsTable';
import { useContractorAuth } from '@/contexts/contractor/ContractorAuthContext';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Toaster } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const ContractorJobs = () => {
  const { 
    activeJobs, 
    completedJobs, 
    loading, 
    error,
    refreshData,
    contractorId
  } = useContractorAuth();

  console.log('ContractorJobs - Current data state:', {
    contractorId,
    activeJobsCount: activeJobs?.length || 0,
    completedJobsCount: completedJobs?.length || 0,
    loading,
    error,
    activeJobs: activeJobs?.map(job => ({ id: job.id.substring(0, 8), title: job.title, status: job.status })),
    completedJobs: completedJobs?.map(job => ({ id: job.id.substring(0, 8), title: job.title, status: job.status }))
  });

  const handleRefresh = () => {
    refreshData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">All Jobs</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Card className="p-6">
            <Tabs defaultValue="active">
              <TabsList className="mb-4">
                <TabsTrigger value="active">
                  Active Jobs ({activeJobs?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedJobs?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="active">
                <RequestsTable 
                  requests={activeJobs || []} 
                  onSelectRequest={(request) => {
                    window.location.href = `/contractor-jobs/${request.id}`;
                  }}
                  filterQuoteRequests={false}
                />
              </TabsContent>
              
              <TabsContent value="completed">
                <RequestsTable 
                  requests={completedJobs || []}
                  onSelectRequest={(request) => {
                    window.location.href = `/contractor-jobs/${request.id}`;
                  }}
                  filterQuoteRequests={false}
                />
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ContractorJobs;
