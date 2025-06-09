
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
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

  // Strict authentication check with immediate redirect
  useEffect(() => {
    console.log('ContractorDashboard - Auth check:', { 
      authLoading, 
      currentUser: !!currentUser,
      userId: currentUser?.id 
    });
    
    if (!authLoading && !currentUser) {
      console.log('ContractorDashboard - No authenticated user, redirecting to login immediately');
      navigate('/login', { replace: true });
      return;
    }
    
    // Additional check to ensure user has contractor role (if applicable)
    if (!authLoading && currentUser && currentUser.role !== 'contractor') {
      console.log('ContractorDashboard - User is not a contractor, redirecting to appropriate dashboard');
      // Redirect to appropriate dashboard based on role
      const redirectPath = currentUser.role === 'admin' ? '/dashboard' : '/dashboard';
      navigate(redirectPath, { replace: true });
      return;
    }
  }, [currentUser, authLoading, navigate]);

  // Prevent any rendering if user is not authenticated or not a contractor
  if (!authLoading && (!currentUser || currentUser.role !== 'contractor')) {
    console.log('ContractorDashboard - Blocking render due to authentication/authorization failure');
    return null;
  }
  
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

  // Loading skeleton placeholder - but only if we have a valid user
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

      {/* Only show main content if no blocking error and user is authenticated */}
      {(!error || contractorId) && currentUser && (
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
        {/* Removed the RequestQuoteDialog since we're now using a separate page */}
      </ContractorProvider>
    </div>
  );
};

export default ContractorDashboard;
