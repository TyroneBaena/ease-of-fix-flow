
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { MaintenanceRequest } from '@/types/maintenance';
import { DashboardErrorState } from '@/components/contractor/dashboard/DashboardErrorState';
import { DashboardLoadingState } from '@/components/contractor/dashboard/DashboardLoadingState';
import { DashboardContent } from '@/components/contractor/dashboard/DashboardContent';
import { useDashboardFilters } from '@/hooks/contractor/useDashboardFilters';
import { useContractorAuth } from '@/contexts/contractor/ContractorAuthContext';
import { Toaster } from "sonner";

const ContractorDashboard = () => {
  const navigate = useNavigate();
  
  const { 
    contractorId,
    pendingQuoteRequests, 
    activeJobs, 
    completedJobs, 
    loading, 
    error,
    refreshData
  } = useContractorAuth();

  const handleSelectRequest = (request: MaintenanceRequest) => {
    console.log('ContractorDashboard - Request selected:', request);
    // Navigate to the quote submission page instead of opening a dialog
    navigate(`/contractor/quote-submission/${request.id}`);
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

  // Loading state
  if (loading) {
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

      {/* Show main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
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
    </div>
  );
};

export default ContractorDashboard;
