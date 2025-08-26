
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
      console.log('=== Starting fetchScheduleData ===');
      setLoading(true);
      setError(null);

      // Get contractor ID for current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user or no user found:', userError);
        throw new Error('User not authenticated');
      }

      console.log('Current user:', user.id);

      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('Contractor query result:', { contractorData, contractorError });

      if (contractorError) {
        console.error('Error fetching contractor:', contractorError);
        throw contractorError;
      }

      if (!contractorData?.id) {
        console.error('No contractor found for user:', user.id);
        throw new Error('Contractor not found');
      }

      console.log('Found contractor ID:', contractorData.id);

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
        console.log('Processing', scheduledJobs.length, 'scheduled jobs');
        for (const job of scheduledJobs) {
          const request = job.maintenance_requests;
          console.log('=== Processing job:', job.id, '===');
          console.log('Job object keys:', Object.keys(job));
          console.log('Job.maintenance_requests:', job.maintenance_requests);
          console.log('Request data type:', typeof request);
          console.log('Request data:', request);
          console.log('Scheduled dates:', job.scheduled_dates);
          
          if (!request) {
            console.log('❌ No request data found for job:', job.id);
            console.log('Job object:', job);
            continue;
          }
          
          console.log('✅ Request data found for job:', job.id);

          // Parse scheduled_dates from jsonb
          const scheduledDatesArray = Array.isArray(job.scheduled_dates) 
            ? job.scheduled_dates 
            : [];
            
          console.log('Job', job.id, 'has', scheduledDatesArray.length, 'scheduled dates');
          console.log('Processed scheduled dates array:', scheduledDatesArray);

          // Create a schedule item for each scheduled date
          for (const dateItem of scheduledDatesArray) {
            console.log('📅 Processing date item:', dateItem);
            if (dateItem && typeof dateItem === 'object' && !Array.isArray(dateItem)) {
              const scheduledDate = dateItem as Record<string, any>;
              
              // Check what time field is available
              const timeValue = scheduledDate.time || scheduledDate.endTime || scheduledDate.startTime;
              
              console.log(`📅 Date: ${scheduledDate.date}, Time: ${timeValue}`);
              
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
                console.log('✅ CREATED ITEM:', scheduleItem.date, scheduleItem.time);
                items.push(scheduleItem);
              } else {
                console.log('❌ SKIPPED - Missing date or time:', { date: scheduledDate.date, time: timeValue });
              }
            }
          }
        }
      }
      
      console.log('=== FINAL PROCESSING RESULTS ===');
      console.log('Total schedule items created:', items.length);
      console.log('Final schedule items:', items);
      
      // Safe reduce operation
      try {
        const itemsByDate = items.reduce((acc, item) => {
          const date = item.date || 'unknown';
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('Items by date:', itemsByDate);
      } catch (reduceError) {
        console.error('Error in reduce operation:', reduceError);
      }

      console.log('About to set schedule items...');
      setScheduleItems(items);
      console.log('Schedule items set successfully');
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setError('Failed to load schedule data');
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
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
    loading,
    error,
    refreshSchedule
  };
};
