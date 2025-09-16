
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { JobSchedulingDialog } from '../scheduling/JobSchedulingDialog';
import { useJobScheduling } from '@/hooks/contractor/useJobScheduling';

interface ScheduleJobCardProps {
  request: MaintenanceRequest;
  onScheduled?: () => void;
}

export const ScheduleJobCard: React.FC<ScheduleJobCardProps> = ({ 
  request, 
  onScheduled 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { scheduleJob } = useJobScheduling();

  const handleScheduleJob = async (requestId: string, scheduledDates: any[]) => {
    await scheduleJob(requestId, scheduledDates);
    if (onScheduled) {
      onScheduled();
    }
  };

  const isSchedulable = (request.status === 'in-progress' || request.status === 'pending') && request.contractorId;

  if (!isSchedulable) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Job
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{request.location}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">{request.priority} Priority</Badge>
              <Badge variant="secondary">{request.status}</Badge>
            </div>

            <p className="text-sm text-gray-600">
              Set up specific dates and times to work on this job. You can schedule multiple visits if needed.
            </p>

            <Button 
              onClick={() => setDialogOpen(true)}
              className="w-full"
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule This Job
            </Button>
          </div>
        </CardContent>
      </Card>

      <JobSchedulingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        job={request}
        onScheduleJob={handleScheduleJob}
      />
    </>
  );
};
