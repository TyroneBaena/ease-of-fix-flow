
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsOverview from '@/components/dashboard/StatsOverview';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import RequestsList from '@/components/dashboard/RequestsList';
import { RequestDetailSidebar } from '@/components/dashboard/RequestDetailSidebar';
import { TrialBillingAlert } from '@/components/dashboard/TrialBillingAlert';
import { BillingWidgets } from '@/components/dashboard/BillingWidgets';
import { PropertyManagementWidget } from '@/components/dashboard/PropertyManagementWidget';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { useContractorProfileMonitoring } from '@/hooks/useContractorProfileMonitoring';
import { SubscriptionProvider } from '@/contexts/subscription/SubscriptionContext';
import { PropertyProvider } from '@/contexts/property/PropertyContext';
import { MaintenanceRequest } from '@/types/maintenance';
import { Button } from '@/components/ui/button';



const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, loading: userLoading } = useUserContext();
  const { requests, loading: requestsLoading } = useMaintenanceRequestContext();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Enable proactive contractor profile monitoring for admin users
  useContractorProfileMonitoring();
  
  // Add loading timeout detection
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
        console.error('⏱️ Dashboard loading timeout detected');
      }, 10000); // 10 second timeout
      
      return () => {
        clearTimeout(timer);
        setLoadingTimeout(false);
      };
    }
  }, [userLoading, requestsLoading]);
  
  // Note: Removed auto-redirect for contractors to prevent infinite loops
  // Contractors should access /contractor-dashboard directly
  // The router guards will handle access control
  
  // Show loading while user or requests are loading
  const isLoading = userLoading || requestsLoading;
  
  console.log('🔍 DASHBOARD - Render state:');
  console.log('🔍 DASHBOARD - currentUser:', currentUser);
  console.log('🔍 DASHBOARD - userLoading:', userLoading);
  console.log('🔍 DASHBOARD - requestsLoading:', requestsLoading);
  console.log('🔍 DASHBOARD - requests count:', requests.length);
  
  // Filter requests to only show those belonging to the current user
  const userRequests = currentUser?.role === 'admin' 
    ? requests 
    : requests.filter(req => req.userId === currentUser?.id);
    
  console.log('🔍 DASHBOARD - userRequests count:', userRequests.length);
  
  // Check for add24 specifically
  const add24InRequests = requests.find(req => req.title?.includes('add24'));
  const add24InUserRequests = userRequests.find(req => req.title?.includes('add24'));
  console.log('🔍 DASHBOARD - add24 in all requests:', add24InRequests ? 'FOUND' : 'NOT FOUND');
  console.log('🔍 DASHBOARD - add24 in user requests:', add24InUserRequests ? 'FOUND' : 'NOT FOUND');

  // Find requests that have progress to show
  const requestsWithProgress = userRequests.filter(req => 
    req.contractorId || req.completionPercentage > 0 || req.status === 'in-progress'
  );
  
  // Show loading state while authentication or data is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
              <p className="text-sm text-gray-400 mt-2">
                {userLoading ? 'Authenticating user...' : 'Loading maintenance requests...'}
              </p>
              {loadingTimeout && (
                <div className="mt-4">
                  <p className="text-sm text-amber-600 mb-2">
                    Loading is taking longer than expected
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Show error state if user failed to load
  if (!currentUser && !userLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.348 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-4">Please log in to access the dashboard.</p>
              <button 
                onClick={() => window.location.href = '/login'}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <SubscriptionProvider>
      <PropertyProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DashboardHeader title="Dashboard" />
            
            {/* Trial/Billing Alert */}
            {/* <div className="mb-6">
              <TrialBillingAlert />
            </div> */}

            {/* Billing Widgets */}
            {/* <div className="mb-6">
              <BillingWidgets />
            </div> */}

            {/* Property Management Widget */}
            <div className="mb-6">
              <PropertyManagementWidget />
            </div>
            
            <div className={`grid gap-6 mt-6 ${selectedRequest ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-4'}`}>
              <div className={`space-y-6 ${selectedRequest ? 'lg:col-span-3' : 'lg:col-span-3'}`}>
                <StatsOverview requestsData={userRequests} />
                <RequestsList 
                  allRequests={userRequests as any} 
                  onRequestSelect={setSelectedRequest}
                  selectedRequest={selectedRequest}
                />
              </div>
              
              {selectedRequest && (
                <RequestDetailSidebar 
                  request={selectedRequest}
                  onClose={() => setSelectedRequest(null)}
                />
              )}
              {/* <DashboardSidebar /> */}
            </div>
          </main>
        </div>
      </PropertyProvider>
    </SubscriptionProvider>
  );
};

export default Dashboard;
