
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Download, Settings } from 'lucide-react';
import { toast } from '@/lib/toast';

export const ScheduleActions: React.FC = () => {
  const handleExportSchedule = () => {
    toast.info('Export functionality coming soon');
  };

  const handleSetAvailability = () => {
    toast.info('Availability settings coming soon');
  };

  const handleBlockTimeOff = () => {
    toast.info('Time off booking coming soon');
  };

  const handleScheduleSettings = () => {
    toast.info('Schedule settings coming soon');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleBlockTimeOff}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Block Time Off
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleSetAvailability}
          >
            <Clock className="h-4 w-4 mr-2" />
            Set Availability
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleExportSchedule}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Schedule
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleScheduleSettings}
          >
            <Settings className="h-4 w-4 mr-2" />
            Schedule Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
