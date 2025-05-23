
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { RequestsTable } from '@/components/contractor/requests/RequestsTable';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { ContractorProvider } from '@/contexts/contractor';
import { MaintenanceRequest } from '@/types/maintenance';
import { useContractorDashboard } from '@/hooks/useContractorDashboard';
import { ContractorMetrics } from '@/components/contractor/dashboard/ContractorMetrics';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from "sonner";

const ContractorDashboard = () => {
  const { 
    pendingQuoteRequests, 
    activeJobs, 
    completedJobs, 
    loading, 
    error,
    refreshData
  } = useContractorDashboard();
  
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  
  const handleSelectRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setQuoteDialogOpen(true);
  };

  // Loading skeleton placeholder
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <Toaster position="bottom-right" richColors />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Contractor Dashboard</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <ContractorMetrics 
              pendingQuotes={pendingQuoteRequests}
              activeJobs={activeJobs}
              completedJobs={completedJobs}
              loading={loading}
            />
            
            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4">Quote Requests</h2>
              <RequestsTable 
                requests={pendingQuoteRequests} 
                onSelectRequest={handleSelectRequest}
              />
            </Card>
            
            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4">Jobs</h2>
              <Tabs defaultValue="active">
                <TabsList className="mb-4">
                  <TabsTrigger value="active">
                    Active Jobs ({activeJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedJobs.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active">
                  <RequestsTable 
                    requests={activeJobs}
                    onSelectRequest={handleSelectRequest} 
                  />
                </TabsContent>
                
                <TabsContent value="completed">
                  <RequestsTable 
                    requests={completedJobs} 
                    onSelectRequest={handleSelectRequest}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  View Calendar
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Update Profile
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
      
      <ContractorProvider>
        <RequestQuoteDialog 
          open={quoteDialogOpen}
          onOpenChange={setQuoteDialogOpen}
          request={selectedRequest}
          onQuoteSubmitted={() => {
            setQuoteDialogOpen(false);
            refreshData();
          }}
        />
      </ContractorProvider>
    </div>
  );
};

export default ContractorDashboard;
