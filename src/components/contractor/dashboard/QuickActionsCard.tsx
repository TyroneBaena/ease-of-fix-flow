
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, User, Bell } from 'lucide-react';

// QuickActionsCard is a leaf component with no props, so we can use simple React.memo
const QuickActionsCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Quick Actions</h2>
      <div className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => navigate('/contractor-schedule')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          View Schedule
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => navigate('/contractor-profile')}
        >
          <User className="mr-2 h-4 w-4" />
          Update Profile
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => navigate('/contractor-notifications')}
        >
          <Bell className="mr-2 h-4 w-4" />
          View Notifications
        </Button>
      </div>
    </Card>
  );
};

export default React.memo(QuickActionsCard);
