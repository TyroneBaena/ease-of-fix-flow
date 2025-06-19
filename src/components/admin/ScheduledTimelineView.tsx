
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User, RefreshCw } from 'lucide-react';
import { useJobScheduling } from '@/hooks/contractor/useJobScheduling';
import { ScheduledDate } from '@/types/scheduling';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduledJob {
  id: string;
  request_id: string;
  contractor_id: string;
  scheduled_dates: ScheduledDate[];
  maintenance_requests: {
    id: string;
    title: string;
    location: string;
    priority: string;
    status: string;
  };
}

export const ScheduledTimelineView: React.FC = () => {
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const { getJobSchedules } = useJobScheduling();

  const fetchScheduledJobs = async () => {
    setLoading(true);
    try {
      const jobs = await getJobSchedules();
      setScheduledJobs(jobs as ScheduledJob[]);
    } catch (error) {
      console.error('Error fetching scheduled jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledJobs();
  }, []);

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getJobsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const jobs: Array<{ job: ScheduledJob; schedule: ScheduledDate }> = [];
    
    scheduledJobs.forEach(job => {
      job.scheduled_dates.forEach(schedule => {
        if (schedule.date === dateString) {
          jobs.push({ job, schedule });
        }
      });
    });
    
    return jobs.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Scheduled Jobs Timeline</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchScheduledJobs}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
            >
              Previous Week
            </Button>
            <h3 className="font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </h3>
            <Button
              variant="outline"
              onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
            >
              Next Week
            </Button>
          </div>

          {/* Timeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map(day => {
              const jobsForDay = getJobsForDate(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div key={day.toISOString()} className={`border rounded-lg p-3 ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                  <div className="font-medium text-sm mb-3">
                    {format(day, 'EEE d')}
                    {isToday && <span className="text-blue-600 ml-1">(Today)</span>}
                  </div>
                  
                  <div className="space-y-2">
                    {jobsForDay.length === 0 ? (
                      <p className="text-xs text-gray-400">No jobs scheduled</p>
                    ) : (
                      jobsForDay.map(({ job, schedule }) => (
                        <div
                          key={`${job.id}-${schedule.id}`}
                          className="bg-white border rounded p-2 text-xs space-y-1"
                        >
                          <div className="font-medium truncate" title={job.maintenance_requests.title}>
                            {job.maintenance_requests.title}
                          </div>
                          
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="h-3 w-3" />
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                          
                          <div className="flex items-center gap-1 text-gray-600 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{job.maintenance_requests.location}</span>
                          </div>
                          
                          <div className="flex gap-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(schedule.status)}`}
                            >
                              {schedule.status}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(job.maintenance_requests.priority)}`}
                            >
                              {job.maintenance_requests.priority}
                            </Badge>
                          </div>
                          
                          {schedule.notes && (
                            <p className="text-gray-500 text-xs truncate" title={schedule.notes}>
                              {schedule.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              Total scheduled jobs this week: {weekDays.reduce((total, day) => total + getJobsForDate(day).length, 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
