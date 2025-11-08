
import { useState, useEffect, useRef } from 'react';
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
  // v77.2: Track initial load to prevent loading flashes on tab revisits
  const hasCompletedInitialLoadRef = useRef(false);

  const fetchScheduleData = async () => {
    try {
      // v77.2: CRITICAL - NEVER set loading after initial load
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(true);
      } else {
        console.log('🔕 v77.2 - ContractorSchedule - SILENT REFRESH');
      }
      setError(null);

      // Get contractor ID for current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (contractorError) {
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
        throw scheduledJobsError;
      }

      // Transform scheduled jobs into schedule items
      const items: ScheduleItem[] = [];
      
      if (scheduledJobs) {
        for (const job of scheduledJobs) {
          const request = job.maintenance_requests;
          
          if (!request) {
            continue;
          }

          // Parse scheduled_dates from jsonb
          const scheduledDatesArray = Array.isArray(job.scheduled_dates) 
            ? job.scheduled_dates 
            : [];

          // Create a schedule item for each scheduled date
          for (const dateItem of scheduledDatesArray) {
            if (dateItem && typeof dateItem === 'object' && !Array.isArray(dateItem)) {
              const scheduledDate = dateItem as Record<string, any>;
              
              // Check what time field is available
              const timeValue = scheduledDate.time || scheduledDate.endTime || scheduledDate.startTime;
              
              if (scheduledDate.date && timeValue) {
                const scheduleItem = {
                  id: `${job.id}-${scheduledDate.date}-${timeValue}`,
                  date: String(scheduledDate.date),
                  time: String(timeValue),
                  task: `${request.category} - ${request.title}`,
                  location: request.location,
                  status: request.status === 'in-progress' ? 'scheduled' as const : 'tentative' as const,
                  requestId: request.id,
                  priority: request.priority
                };
                items.push(scheduleItem);
              }
            }
          }
        }
      }
      
      console.log('📅 Schedule Summary:', items.length, 'appointments found');
      items.forEach(item => console.log(`- ${item.date} at ${item.time}: ${item.task}`));

      setScheduleItems(items);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setError('Failed to load schedule data');
      toast.error('Failed to load schedule');
    } finally {
      // v77.2: Mark initial load as complete
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(false);
      }
      hasCompletedInitialLoadRef.current = true;
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // Wait for auth to be ready
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('Auth is ready, fetching schedule data for user:', session.user.id);
        fetchScheduleData();
      } else {
        console.log('No session found, skipping schedule fetch');
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, []);

  const refreshSchedule = () => {
    fetchScheduleData();
  };

  return {
    scheduleItems,
    // v77.2: Override loading after initial load completes
    loading: hasCompletedInitialLoadRef.current ? false : loading,
    error,
    refreshSchedule
  };
};
