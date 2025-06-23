
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsOverview from '@/components/dashboard/StatsOverview';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import RequestsList from '@/components/dashboard/RequestsList';
import { RequestDetailSidebar } from '@/components/dashboard/RequestDetailSidebar';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { MaintenanceRequest } from '@/types/maintenance';

const Dashboard = () => {
  const { currentUser } = useUserContext();
  const { requests } = useMaintenanceRequestContext();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  
  // Filter requests to only show those belonging to the current user
  const userRequests = currentUser?.role === 'admin' 
    ? requests 
    : requests.filter(req => req.userId === currentUser?.id);

  // Find requests that have progress to show
  const requestsWithProgress = userRequests.filter(req => 
    req.contractorId || req.completionPercentage > 0 || req.status === 'in-progress'
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader title="Dashboard" />
        
        <div className={`grid gap-6 mt-6 ${selectedRequest ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-4'}`}>
          <div className={`space-y-6 ${selectedRequest ? 'lg:col-span-3' : 'lg:col-span-3'}`}>
            <StatsOverview requestsData={userRequests} />
            <RequestsList 
              allRequests={userRequests as any} 
              onRequestSelect={setSelectedRequest}
              selectedRequest={selectedRequest}
            />
          </div>
          
          {selectedRequest ? (
            <RequestDetailSidebar 
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
            />
          ) : (
            <DashboardSidebar />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
