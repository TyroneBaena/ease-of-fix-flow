
import React from 'react';
import { Card } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import StatusChart from '@/components/StatusChart';
import CategoryChart from '@/components/CategoryChart';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';

const AnalyticsCard = () => {
  // Get maintenance requests from context
  const { requests } = useMaintenanceRequestContext();
  
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
        Analytics
      </h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Request Status</h3>
          <div className="h-64">
            <StatusChart requests={requests} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Request Categories</h3>
          <div className="h-64">
            <CategoryChart />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AnalyticsCard;
