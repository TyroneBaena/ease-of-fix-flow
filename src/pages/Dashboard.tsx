
import React, { useMemo } from 'react';
import Navbar from '@/components/Navbar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsOverview from '@/components/dashboard/StatsOverview';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import RequestsList from '@/components/dashboard/RequestsList';
import { requests as sampleRequests } from '@/data/sampleData';
import { useUserContext } from '@/contexts/UserContext';
import { MaintenanceRequest } from '@/types/property';

const Dashboard = () => {
  const { currentUser } = useUserContext();
  
  // Map sample data to MaintenanceRequest type
  const typedRequests = useMemo(() => {
    return sampleRequests.map(req => ({
      ...req,
      isParticipantRelated: false,
      participantName: 'N/A',
      attemptedFix: '',
      issueNature: req.title || '',
      explanation: req.description || '',
      location: req.location || '',
      reportDate: req.createdAt.split('T')[0] || '',
      site: req.category || '',
      submittedBy: '',
    } as MaintenanceRequest));
  }, []);
  
  // Calculate request statistics
  const { openRequests, inProgressRequests, completedRequests } = useMemo(() => {
    const open = typedRequests.filter(req => req.status === 'open').length;
    const inProgress = typedRequests.filter(req => req.status === 'in-progress').length;
    const completed = typedRequests.filter(req => req.status === 'completed').length;
    
    return {
      openRequests: open,
      inProgressRequests: inProgress,
      completedRequests: completed
    };
  }, [typedRequests]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <DashboardHeader title="Dashboard" />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-3 space-y-6">
            <StatsOverview 
              openRequests={openRequests}
              inProgressRequests={inProgressRequests}
              completedRequests={completedRequests}
            />
            <RequestsList allRequests={typedRequests} />
          </div>
          <DashboardSidebar />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
