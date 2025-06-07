
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { ContractorProvider } from '@/contexts/contractor';
import { MaintenanceRequest } from '@/types/maintenance';
import { useContractorDashboard } from '@/hooks/useContractorDashboard';
import { DashboardErrorState } from '@/components/contractor/dashboard/DashboardErrorState';
import { DashboardLoadingState } from '@/components/contractor/dashboard/DashboardLoadingState';
import { DashboardContent } from '@/components/contractor/dashboard/DashboardContent';
import { useDashboardFilters } from '@/hooks/contractor/useDashboardFilters';
import { useUserContext } from '@/contexts/UserContext';
import { Toaster } from "sonner";

const ContractorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useUserContext();
  
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

  // Check authentication and redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      console.log('ContractorDashboard - No authenticated user, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  // Don't render anything if user is not authenticated
  if (!authLoading && !currentUser) {
    return null;
  }
  
  const handleSelectRequest = (request: MaintenanceRequest) => {
    console.log('ContractorDashboard - Request selected:', request);
    setSelectedRequest(request);
    setQuoteDialogOpen(true);
  };

  const {
    filteredQuoteRequests,
    filteredActiveJobs,
    filteredCompletedJobs
  } = useDashboardFilters({
    pendingQuoteRequests,
    activeJobs,
    completedJobs
  });

  // Loading skeleton placeholder
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ContractorHeader />
        <Toaster position="bottom-right" richColors />
        <DashboardLoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      
      <DashboardErrorState 
        error={error}
        contractorId={contractorId}
        refreshData={refreshData}
        loading={loading}
      />

      {/* Only show main content if no blocking error */}
      {(!error || contractorId) && (
        <main className="container mx-auto px-4 py-8">
          {error && contractorId && (
            <DashboardErrorState 
              error={error}
              contractorId={contractorId}
              refreshData={refreshData}
              loading={loading}
            />
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
          
          <DashboardContent
            filteredQuoteRequests={filteredQuoteRequests}
            filteredActiveJobs={filteredActiveJobs}
            filteredCompletedJobs={filteredCompletedJobs}
            loading={loading}
            onSelectRequest={handleSelectRequest}
          />
        </main>
      )}
      
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
