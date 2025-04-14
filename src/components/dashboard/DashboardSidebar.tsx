
import React from 'react';
import ReportsCard from './ReportsCard';
import UpcomingMaintenanceCard from './UpcomingMaintenanceCard';

const DashboardSidebar = () => {
  return (
    <div className="space-y-6">
      <ReportsCard />
      <UpcomingMaintenanceCard />
    </div>
  );
};

export default DashboardSidebar;
