
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
import { SessionDebugger } from '@/components/contractor/SessionDebugger';
import { DirectContractorTest } from '@/components/contractor/DirectContractorTest';
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

  // Remove auto-refresh to prevent infinite loops
  // The ContractorAuthContext already handles data fetching properly

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

  // Loading state - only show when actually loading data
  if (loading && !contractorId) {
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
      
      {/* Show error state prominently if there's a critical error */}
      {error && !contractorId ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardErrorState 
            error={error}
            contractorId={contractorId}
            refreshData={refreshData}
            loading={loading}
          />
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          
          {/* Show minor errors as warnings but still show content */}
          {error && contractorId && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">{error}</p>
            </div>
          )}
          
          <DashboardContent
            filteredQuoteRequests={filteredQuoteRequests}
            filteredActiveJobs={filteredActiveJobs}
            filteredCompletedJobs={filteredCompletedJobs}
            loading={loading}
            onSelectRequest={handleSelectRequest}
          />
        </main>
      )}
      
      {/* Debug Components */}
      <div className="space-y-4 mt-8">
        <DirectContractorTest />
        <SessionDebugger />
      </div>
      
      <Toaster />
    </div>
  );
};

export default ContractorDashboard;
