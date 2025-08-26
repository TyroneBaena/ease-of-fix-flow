
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
      
      if (scheduledJobs) {
        for (const job of scheduledJobs) {
          const request = job.maintenance_requests;
          if (!request) continue;

          // Parse scheduled_dates from jsonb
          const scheduledDatesArray = Array.isArray(job.scheduled_dates) 
            ? job.scheduled_dates 
            : [];

          // Create a schedule item for each scheduled date
          for (const dateItem of scheduledDatesArray) {
            if (dateItem && typeof dateItem === 'object' && !Array.isArray(dateItem)) {
              const scheduledDate = dateItem as Record<string, any>;
              if (scheduledDate.date && scheduledDate.time) {
                items.push({
                  id: `${job.id}-${scheduledDate.date}-${scheduledDate.time}`,
                  date: String(scheduledDate.date),
                  time: String(scheduledDate.time),
                  task: `${request.category} - ${request.title}`,
                  location: request.location,
                  status: request.status === 'in-progress' ? 'scheduled' as const : 'tentative' as const,
                  requestId: request.id,
                  priority: request.priority
                });
              }
            }
          }
        }
      }

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
