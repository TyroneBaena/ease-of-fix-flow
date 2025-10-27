
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Edit, Trash2 } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { JobSchedulingDialog } from '../scheduling/JobSchedulingDialog';
import { useJobScheduling } from '@/hooks/contractor/useJobScheduling';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Database schema type (snake_case)
type DbJobSchedule = {
  id: string;
  request_id: string;
  contractor_id: string;
  scheduled_dates: any;
  created_at: string;
  updated_at: string;
};

interface ScheduleJobCardProps {
  request: MaintenanceRequest;
  onScheduled?: () => void;
}

export const ScheduleJobCard: React.FC<ScheduleJobCardProps> = ({ 
  request, 
  onScheduled 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [existingSchedule, setExistingSchedule] = useState<DbJobSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const { scheduleJob } = useJobScheduling();

  // Fetch existing schedule
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const { data, error } = await supabase
          .from('job_schedules')
          .select('*')
          .eq('request_id', request.id)
          .maybeSingle();

        if (error) throw error;
        setExistingSchedule(data);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [request.id]);

  const handleScheduleJob = async (requestId: string, scheduledDates: any[]) => {
    // If editing existing schedule, delete it first
    if (existingSchedule) {
      await handleDeleteSchedule(false); // Don't show toast or refresh yet
    }
    
    await scheduleJob(requestId, scheduledDates);
    
    // Refresh to show updated schedule
    const { data } = await supabase
      .from('job_schedules')
      .select('*')
      .eq('request_id', request.id)
      .maybeSingle();
    
    setExistingSchedule(data);
    
    if (onScheduled) {
      onScheduled();
    }
  };

  const handleDeleteSchedule = async (showNotifications = true) => {
    if (!existingSchedule) return;

    try {
      const { error } = await supabase
        .from('job_schedules')
        .delete()
        .eq('id', existingSchedule.id);

      if (error) throw error;

      if (showNotifications) {
        toast.success('Schedule deleted successfully');
      }
      setExistingSchedule(null);
      if (showNotifications && onScheduled) {
        onScheduled();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      if (showNotifications) {
        toast.error('Failed to delete schedule');
      }
    }
  };

  const isSchedulable = request.status !== 'completed';

  if (!isSchedulable || loading) {
    return null;
  }

  // Show existing schedule details if schedule exists
  if (existingSchedule) {
    const scheduledDates = existingSchedule.scheduled_dates as any[];
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Visits
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

              <div className="space-y-3 border-t pt-3">
                {scheduledDates?.map((date: any, index: number) => (
                  <div key={date.id || index} className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(date.date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-muted-foreground ml-6">
                      {date.startTime} - {date.endTime}
                    </div>
                    {date.notes && (
                      <div className="text-sm text-muted-foreground ml-6 mt-1">
                        {date.notes}
                      </div>
                    )}
                    <Badge variant="outline" className="ml-6 mt-2">
                      {date.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setDialogOpen(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Schedule
                </Button>
                <Button 
                  onClick={() => handleDeleteSchedule()}
                  variant="destructive"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <JobSchedulingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          job={request}
          onScheduleJob={handleScheduleJob}
          existingScheduleDates={scheduledDates}
        />
      </>
    );
  }

  // Show schedule creation UI if no schedule exists
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
