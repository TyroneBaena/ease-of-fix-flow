import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Plus, X } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { SchedulingFormData } from '@/types/scheduling';
import { toast } from '@/lib/toast';
import { useSchedulingHistory } from '@/hooks/contractor/useSchedulingHistory';
import { SchedulingHistoryCard } from './SchedulingHistoryCard';

interface JobSchedulingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: MaintenanceRequest;
  onScheduleJob: (requestId: string, scheduledDates: SchedulingFormData[]) => Promise<void>;
}

export const JobSchedulingDialog: React.FC<JobSchedulingDialogProps> = ({
  open,
  onOpenChange,
  job,
  onScheduleJob
}) => {
  const [scheduledDates, setScheduledDates] = useState<SchedulingFormData[]>([
    { date: '', startTime: '09:00', endTime: '17:00', notes: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { history, loading: historyLoading, addHistoryEntry } = useSchedulingHistory(open ? job.id : null);

  const addScheduleDate = () => {
    setScheduledDates([
      ...scheduledDates,
      { date: '', startTime: '09:00', endTime: '17:00', notes: '' }
    ]);
  };

  const removeScheduleDate = (index: number) => {
    if (scheduledDates.length > 1) {
      setScheduledDates(scheduledDates.filter((_, i) => i !== index));
    }
  };

  const updateScheduleDate = (index: number, field: keyof SchedulingFormData, value: string) => {
    const updated = [...scheduledDates];
    updated[index] = { ...updated[index], [field]: value };
    setScheduledDates(updated);
  };

  const handleSubmit = async () => {
    // Validate required fields
    const validDates = scheduledDates.filter(date => date.date && date.startTime && date.endTime);
    
    if (validDates.length === 0) {
      toast.error('Please add at least one valid schedule date');
      return;
    }

    // Validate time ranges
    const invalidTimes = validDates.some(date => date.startTime >= date.endTime);
    if (invalidTimes) {
      toast.error('End time must be after start time');
      return;
    }

    setIsSubmitting(true);
    try {
      await onScheduleJob(job.id, validDates);
      
      // Log the scheduling action
      if (job.contractorId) {
        await addHistoryEntry(
          job.contractorId,
          'scheduled',
          validDates,
          'Job scheduled by contractor'
        );
      }
      
      toast.success('Job scheduled successfully');
      onOpenChange(false);
      // Reset form
      setScheduledDates([{ date: '', startTime: '09:00', endTime: '17:00', notes: '' }]);
    } catch (error) {
      console.error('Error scheduling job:', error);
      toast.error('Failed to schedule job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Job</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schedule" className="space-y-6">
            {/* Job Info */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium mb-2">{job.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{job.location}</span>
                  <Badge variant="outline">{job.priority}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Dates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Schedule Dates</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addScheduleDate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Date
                </Button>
              </div>

              {scheduledDates.map((scheduleDate, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Date {index + 1}</span>
                      </div>
                      {scheduledDates.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeScheduleDate(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`date-${index}`}>Date</Label>
                        <Input
                          id={`date-${index}`}
                          type="date"
                          value={scheduleDate.date}
                          onChange={(e) => updateScheduleDate(index, 'date', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`start-time-${index}`}>Start Time</Label>
                        <Input
                          id={`start-time-${index}`}
                          type="time"
                          value={scheduleDate.startTime}
                          onChange={(e) => updateScheduleDate(index, 'startTime', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`end-time-${index}`}>End Time</Label>
                        <Input
                          id={`end-time-${index}`}
                          type="time"
                          value={scheduleDate.endTime}
                          onChange={(e) => updateScheduleDate(index, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor={`notes-${index}`}>Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${index}`}
                        placeholder="Any additional notes for this scheduled date..."
                        value={scheduleDate.notes}
                        onChange={(e) => updateScheduleDate(index, 'notes', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Scheduling...' : 'Schedule Job'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <SchedulingHistoryCard 
              history={history}
              loading={historyLoading}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
