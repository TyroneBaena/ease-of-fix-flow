
import React from 'react';
import { Card } from '@/components/ui/card';
import { ClipboardList, Clock, CheckCircle, DollarSign } from 'lucide-react';

interface ContractorStatsProps {
  totalRequests?: number;
  pendingQuotes?: number;
  activeJobs?: number;
  totalQuoted?: number;
}

// Custom comparison function for ContractorStats
const arePropsEqual = (prevProps: ContractorStatsProps, nextProps: ContractorStatsProps) => {
  return (
    prevProps.totalRequests === nextProps.totalRequests &&
    prevProps.pendingQuotes === nextProps.pendingQuotes &&
    prevProps.activeJobs === nextProps.activeJobs &&
    prevProps.totalQuoted === nextProps.totalQuoted
  );
};

export const ContractorStats = ({ 
  totalRequests = 2, 
  pendingQuotes = 1, 
  activeJobs = 1, 
  totalQuoted = 350 
}: ContractorStatsProps = {}) => {
  // Debug logging to track renders
  console.log(`💼 ContractorStats re-rendered with values:`, { totalRequests, pendingQuotes, activeJobs, totalQuoted });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClipboardList className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-2xl font-bold">{totalRequests}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Quotes</p>
            <p className="text-2xl font-bold">{pendingQuotes}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Jobs</p>
            <p className="text-2xl font-bold">{activeJobs}</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Quoted</p>
            <p className="text-2xl font-bold">${totalQuoted}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(ContractorStats, arePropsEqual);
