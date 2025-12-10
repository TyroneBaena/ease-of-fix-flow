
import React, { useMemo } from 'react';
import StatCard from './StatCard';
import { AlertCircle, Wrench, CheckCircle, Users } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';

interface StatsOverviewProps {
  openRequests?: number;
  assignedRequests?: number;
  inProgressRequests?: number;
  completedRequests?: number;
  requestsData?: MaintenanceRequest[];
}

const StatsOverview = ({ 
  openRequests, 
  assignedRequests,
  inProgressRequests, 
  completedRequests, 
  requestsData 
}: StatsOverviewProps) => {
  const stats = useMemo(() => {
    if (requestsData) {
      const open = requestsData.filter(req => req.status === 'open' || req.status === 'pending').length;
      
      // "Assigned" combines contractor assignments AND landlord assignments
      const assigned = requestsData.filter(req => {
        const isContractorAssigned = req.status === 'requested';
        const isLandlordAssigned = req.assigned_to_landlord === true && 
          !['completed', 'cancelled'].includes(req.status);
        return isContractorAssigned || isLandlordAssigned;
      }).length;
      
      const inProgress = requestsData.filter(req => req.status === 'in-progress').length;
      const completed = requestsData.filter(req => req.status === 'completed').length;
      
      return { open, assigned, inProgress, completed };
    }
    
    return {
      open: openRequests || 0,
      assigned: assignedRequests || 0,
      inProgress: inProgressRequests || 0,
      completed: completedRequests || 0
    };
  }, [requestsData, openRequests, assignedRequests, inProgressRequests, completedRequests]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard 
        title="Open Requests" 
        value={stats.open} 
        icon={<AlertCircle className="h-8 w-8 text-amber-500" />}
        color="bg-amber-50"
        tooltipText="Pending and open maintenance requests"
      />
      <StatCard 
        title="Assigned" 
        value={stats.assigned} 
        icon={<Users className="h-8 w-8 text-purple-500" />}
        color="bg-purple-50"
        tooltipText="Requests assigned to contractor or landlord"
      />
      <StatCard 
        title="In Progress" 
        value={stats.inProgress} 
        icon={<Wrench className="h-8 w-8 text-blue-500" />}
        color="bg-blue-50"
        tooltipText="Requests currently being worked on"
      />
      <StatCard 
        title="Completed" 
        value={stats.completed} 
        icon={<CheckCircle className="h-8 w-8 text-green-500" />}
        color="bg-green-50"
        tooltipText="Successfully completed requests"
      />
    </div>
  );
};

export default StatsOverview;
