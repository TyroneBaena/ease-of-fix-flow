
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
import { RefreshCw, AlertCircle } from 'lucide-react';
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
    contractorId,
    refreshData
  } = useContractorDashboard();
  
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  
  const handleSelectRequest = (request: MaintenanceRequest) => {
    console.log('ContractorDashboard - Request selected:', request);
    setSelectedRequest(request);
    setQuoteDialogOpen(true);
  };

  // Filter quote requests to only show requests that need quotes to be submitted
  const filteredQuoteRequests = pendingQuoteRequests.filter(request => {
    // Only show requests where quotes are requested but not yet submitted or are in 'requested' status
    if (request.quote && typeof request.quote !== 'string') {
      return request.quote.status === 'requested';
    }
    // Also include requests where quoteRequested is true but no quote object exists yet
    return request.quoteRequested === true;
  });

  // Filter active jobs to only show jobs that are actually in progress (not just quote submissions)
  const filteredActiveJobs = activeJobs.filter(request => {
    // Only show jobs that are in 'in-progress' status and have approved quotes
    if (request.status === 'in-progress') {
      if (request.quote && typeof request.quote !== 'string') {
        return request.quote.status === 'approved';
      }
      // Or if it has a quoted amount (legacy data)
      return request.quotedAmount !== undefined && request.quotedAmount !== null;
    }
    return false;
  });

  // Filter completed jobs to only show jobs that are completed and had quotes
  const filteredCompletedJobs = completedJobs.filter(request => {
    const hasQuote = request.quotedAmount || 
                    (request.quote && typeof request.quote !== 'string' && request.quote.amount);
    return hasQuote && request.status === 'completed';
  });

  console.log('ContractorDashboard - Quote Requests:', filteredQuoteRequests.length);
  console.log('ContractorDashboard - Active Jobs:', filteredActiveJobs.length);
  console.log('ContractorDashboard - Completed Jobs:', filteredCompletedJobs.length);

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

  // Error state - show error but allow retry
  if (error && !contractorId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <Toaster position="bottom-right" richColors />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
          
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contractor Access Required</h2>
            <p className="text-gray-600 mb-4">
              You need a contractor profile to access this dashboard. Please contact your administrator to set up your contractor account.
            </p>
            <Button onClick={refreshData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        {error && contractorId && (
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
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <ContractorMetrics 
              pendingQuotes={filteredQuoteRequests}
              activeJobs={filteredActiveJobs}
              completedJobs={filteredCompletedJobs}
              loading={loading}
            />
            
            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4">Quote Requests ({filteredQuoteRequests.length})</h2>
              <RequestsTable 
                requests={filteredQuoteRequests} 
                onSelectRequest={handleSelectRequest}
                filterQuoteRequests={true}
              />
            </Card>
            
            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4">Jobs</h2>
              <Tabs defaultValue="active">
                <TabsList className="mb-4">
                  <TabsTrigger value="active">
                    Active Jobs ({filteredActiveJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({filteredCompletedJobs.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active">
                  <RequestsTable 
                    requests={filteredActiveJobs}
                    onSelectRequest={handleSelectRequest}
                    filterQuoteRequests={false}
                  />
                </TabsContent>
                
                <TabsContent value="completed">
                  <RequestsTable 
                    requests={filteredCompletedJobs} 
                    onSelectRequest={handleSelectRequest}
                    filterQuoteRequests={false}
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
            setSelectedRequest(null);
            refreshData();
          }}
        />
      </ContractorProvider>
    </div>
  );
};

export default ContractorDashboard;
