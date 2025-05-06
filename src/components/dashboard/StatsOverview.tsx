
import React, { useMemo } from 'react';
import StatCard from './StatCard';
import { AlertCircle, Wrench, CheckCircle } from 'lucide-react';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { MaintenanceRequest } from '@/types/maintenance';

interface StatsOverviewProps {
  openRequests?: number;
  inProgressRequests?: number;
  completedRequests?: number;
  requestsData?: MaintenanceRequest[];
}

const StatsOverview = ({ openRequests, inProgressRequests, completedRequests, requestsData }: StatsOverviewProps) => {
  // If we have requestsData, calculate the counts; otherwise, use provided props
  const stats = useMemo(() => {
    if (requestsData) {
      const open = requestsData.filter(req => req.status === 'open' || req.status === 'pending').length;
      const inProgress = requestsData.filter(req => req.status === 'in-progress').length;
      const completed = requestsData.filter(req => req.status === 'completed').length;
      
      return {
        open,
        inProgress,
        completed
      };
    }
    
    return {
      open: openRequests || 0,
      inProgress: inProgressRequests || 0,
      completed: completedRequests || 0
    };
  }, [requestsData, openRequests, inProgressRequests, completedRequests]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard 
        title="Open Requests" 
        value={stats.open} 
        icon={<AlertCircle className="h-8 w-8 text-amber-500" />}
        color="bg-amber-50"
        tooltipText="Pending and open maintenance requests"
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
