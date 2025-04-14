
import React, { useMemo } from 'react';
import Navbar from '@/components/Navbar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsOverview from '@/components/dashboard/StatsOverview';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import RequestsList from '@/components/dashboard/RequestsList';
import AdminRoleUpdater from '@/components/AdminRoleUpdater';
import { requests as sampleRequests } from '@/data/sampleData';
import { useUserContext } from '@/contexts/UserContext';

const Dashboard = () => {
  const { currentUser } = useUserContext();
  
  // Calculate request statistics
  const { openRequests, inProgressRequests, completedRequests } = useMemo(() => {
    const open = sampleRequests.filter(req => req.status === 'open').length;
    const inProgress = sampleRequests.filter(req => req.status === 'in-progress').length;
    const completed = sampleRequests.filter(req => req.status === 'completed').length;
    
    return {
      openRequests: open,
      inProgressRequests: inProgress,
      completedRequests: completed
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <DashboardHeader title="Dashboard" />
        
        {/* Add the AdminRoleUpdater component */}
        <AdminRoleUpdater />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-3 space-y-6">
            <StatsOverview 
              openRequests={openRequests}
              inProgressRequests={inProgressRequests}
              completedRequests={completedRequests}
            />
            <RequestsList allRequests={sampleRequests} />
          </div>
          <DashboardSidebar />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
