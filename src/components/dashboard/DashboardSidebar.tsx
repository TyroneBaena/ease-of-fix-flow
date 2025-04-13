
import React from 'react';
import AnalyticsCard from './AnalyticsCard';
import UpcomingMaintenanceCard from './UpcomingMaintenanceCard';

const DashboardSidebar = () => {
  return (
    <div className="space-y-6">
      <AnalyticsCard />
      <UpcomingMaintenanceCard />
    </div>
  );
};

export default DashboardSidebar;
