
import React from 'react';
import Navbar from '@/components/Navbar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsOverview from '@/components/dashboard/StatsOverview';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import RequestsList from '@/components/dashboard/RequestsList';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';

const Dashboard = () => {
  const { currentUser } = useUserContext();
  const { requests } = useMaintenanceRequestContext();
  
  // Filter requests to only show those belonging to the current user
  // Updated to use userId instead of user_id to match MaintenanceRequest type
  const userRequests = currentUser?.role === 'admin' 
    ? requests 
    : requests.filter(req => req.userId === currentUser?.id);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <DashboardHeader title="Dashboard" />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-3 space-y-6">
            <StatsOverview requestsData={userRequests} />
            <RequestsList allRequests={userRequests as any} />
          </div>
          <DashboardSidebar />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
