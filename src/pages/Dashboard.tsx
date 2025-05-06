
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <DashboardHeader title="Dashboard" />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-3 space-y-6">
            <StatsOverview requestsData={requests} />
            <RequestsList allRequests={requests as any} />
          </div>
          <DashboardSidebar />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
