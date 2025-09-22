import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Users, Building, FileText, Bell } from 'lucide-react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import ReportsCard from './ReportsCard';
const DashboardSidebar = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserContext();

  return (
    <div className="space-y-6">
      {/* Admin Quick Actions */}
      {isAdmin && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Admin Actions</h2>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/properties')}
            >
              <Building className="mr-2 h-4 w-4" />
              Manage Properties
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/reports')}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Reports
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
          </div>
        </Card>
      )}
      
      {/* Existing cards */}
      <ReportsCard />
    </div>
  );
};

export default DashboardSidebar;
