
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

export interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  task: string;
  location: string;
  status: 'scheduled' | 'tentative' | 'completed';
  requestId: string;
  priority: string;
}

export const useContractorSchedule = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get contractor ID for current user
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (contractorError) {
        console.error('Error fetching contractor:', contractorError);
        throw contractorError;
      }

      if (!contractorData?.id) {
        throw new Error('Contractor not found');
      }

      // Fetch scheduled jobs for this contractor
      const { data: scheduledJobs, error: scheduledJobsError } = await supabase
        .from('job_schedules')
        .select(`
          *,
          maintenance_requests (
            id,
            title,
            category,
            location,
            priority,
            status
          )
        `)
        .eq('contractor_id', contractorData.id)
        .order('created_at', { ascending: true });

      if (scheduledJobsError) {
        console.error('Error fetching scheduled jobs:', scheduledJobsError);
        throw scheduledJobsError;
      }

      // Transform scheduled jobs into schedule items
      const items: ScheduleItem[] = [];
      
      console.log('Raw scheduled jobs data:', scheduledJobs);
      
      if (scheduledJobs) {
        for (const job of scheduledJobs) {
          const request = job.maintenance_requests;
          console.log('Processing job:', job);
          console.log('Request data:', request);
          console.log('Scheduled dates:', job.scheduled_dates);
          
          if (!request) {
            console.log('No request data found for job:', job.id);
            continue;
          }

          // Parse scheduled_dates from jsonb
          const scheduledDatesArray = Array.isArray(job.scheduled_dates) 
            ? job.scheduled_dates 
            : [];
            
          console.log('Processed scheduled dates array:', scheduledDatesArray);

          // Create a schedule item for each scheduled date
          for (const dateItem of scheduledDatesArray) {
            console.log('Processing date item:', dateItem);
            if (dateItem && typeof dateItem === 'object' && !Array.isArray(dateItem)) {
              const scheduledDate = dateItem as Record<string, any>;
              console.log('Scheduled date object:', scheduledDate);
              if (scheduledDate.date && scheduledDate.time) {
                const scheduleItem = {
                  id: `${job.id}-${scheduledDate.date}-${scheduledDate.time}`,
                  date: String(scheduledDate.date),
                  time: String(scheduledDate.time),
                  task: `${request.category} - ${request.title}`,
                  location: request.location,
                  status: request.status === 'in-progress' ? 'scheduled' as const : 'tentative' as const,
                  requestId: request.id,
                  priority: request.priority
                };
                console.log('Created schedule item:', scheduleItem);
                items.push(scheduleItem);
              } else {
                console.log('Missing date or time in scheduled date:', scheduledDate);
              }
            } else {
              console.log('Invalid date item format:', dateItem);
            }
          }
        }
      }
      
      console.log('Final schedule items:', items);

      setScheduleItems(items);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setError('Failed to load schedule data');
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const refreshSchedule = () => {
    fetchScheduleData();
  };

  return {
    scheduleItems,
    loading,
    error,
    refreshSchedule
  };
};
