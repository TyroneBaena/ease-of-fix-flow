
import React, { useMemo } from 'react';
import StatCard from './StatCard';
import { AlertCircle, Wrench, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { MaintenanceRequest } from '@/types/maintenance';

interface StatsOverviewProps {
  openRequests?: number;
  requestedRequests?: number;
  inProgressRequests?: number;
  completedRequests?: number;
  cancelledRequests?: number;
  requestsData?: MaintenanceRequest[];
}

const StatsOverview = ({ 
  openRequests, 
  requestedRequests,
  inProgressRequests, 
  completedRequests, 
  cancelledRequests,
  requestsData 
}: StatsOverviewProps) => {
  // If we have requestsData, calculate the counts; otherwise, use provided props
  const stats = useMemo(() => {
    if (requestsData) {
      const open = requestsData.filter(req => req.status === 'open' || req.status === 'pending').length;
      const requested = requestsData.filter(req => req.status === 'requested').length;
      const inProgress = requestsData.filter(req => req.status === 'in-progress').length;
      const completed = requestsData.filter(req => req.status === 'completed').length;
      const cancelled = requestsData.filter(req => req.status === 'cancelled').length;
      
      return {
        open,
        requested,
        inProgress,
        completed,
        cancelled
      };
    }
    
    return {
      open: openRequests || 0,
      requested: requestedRequests || 0,
      inProgress: inProgressRequests || 0,
      completed: completedRequests || 0,
      cancelled: cancelledRequests || 0
    };
  }, [requestsData, openRequests, requestedRequests, inProgressRequests, completedRequests, cancelledRequests]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      <StatCard 
        title="Open Requests" 
        value={stats.open} 
        icon={<AlertCircle className="h-8 w-8 text-amber-500" />}
        color="bg-amber-50"
        tooltipText="Pending and open maintenance requests"
      />
      <StatCard 
        title="Requested" 
        value={stats.requested} 
        icon={<Clock className="h-8 w-8 text-purple-500" />}
        color="bg-purple-50"
        tooltipText="Requests awaiting contractor quote or assignment"
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
      <StatCard 
        title="Cancelled" 
        value={stats.cancelled} 
        icon={<XCircle className="h-8 w-8 text-red-500" />}
        color="bg-red-50"
        tooltipText="Cancelled maintenance requests"
      />
    </div>
  );
};

export default StatsOverview;
