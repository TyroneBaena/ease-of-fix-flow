
import React from 'react';
import StatCard from './StatCard';
import { AlertCircle, Wrench, CheckCircle } from 'lucide-react';

interface StatsOverviewProps {
  openRequests: number;
  inProgressRequests: number;
  completedRequests: number;
}

const StatsOverview = ({ openRequests, inProgressRequests, completedRequests }: StatsOverviewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard 
        title="Open Requests" 
        value={openRequests} 
        icon={<AlertCircle className="h-8 w-8 text-amber-500" />}
        color="bg-amber-50"
      />
      <StatCard 
        title="In Progress" 
        value={inProgressRequests} 
        icon={<Wrench className="h-8 w-8 text-blue-500" />}
        color="bg-blue-50"
      />
      <StatCard 
        title="Completed" 
        value={completedRequests} 
        icon={<CheckCircle className="h-8 w-8 text-green-500" />}
        color="bg-green-50"
      />
    </div>
  );
};

export default StatsOverview;
