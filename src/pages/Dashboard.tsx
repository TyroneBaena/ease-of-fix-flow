
import React, { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { MaintenanceRequest } from '@/types/property';
import Navbar from '@/components/Navbar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsOverview from '@/components/dashboard/StatsOverview';
import RequestsList from '@/components/dashboard/RequestsList';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

const Dashboard = () => {
  const { properties, getRequestsForProperty } = usePropertyContext();
  const [allRequests, setAllRequests] = useState<MaintenanceRequest[]>([]);

  // Collect all requests from all properties
  useEffect(() => {
    const requests: MaintenanceRequest[] = [];
    properties.forEach(property => {
      const propertyRequests = getRequestsForProperty(property.id);
      requests.push(...propertyRequests);
    });
    
    // Sort by created date (newest first)
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setAllRequests(requests);
  }, [properties, getRequestsForProperty]);

  // Count requests by status
  const openRequests = allRequests.filter(req => req.status === 'open').length;
  const inProgressRequests = allRequests.filter(req => req.status === 'in-progress').length;
  const completedRequests = allRequests.filter(req => req.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader title="Maintenance Dashboard" />
        
        <StatsOverview 
          openRequests={openRequests}
          inProgressRequests={inProgressRequests}
          completedRequests={completedRequests}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <RequestsList allRequests={allRequests} />
          </div>
          
          {/* Sidebar */}
          <DashboardSidebar />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
