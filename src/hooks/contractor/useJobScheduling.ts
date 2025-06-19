
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SchedulingFormData, ScheduledDate } from '@/types/scheduling';
import { toast } from '@/lib/toast';

export const useJobScheduling = () => {
  const [isLoading, setIsLoading] = useState(false);

  const scheduleJob = useCallback(async (requestId: string, scheduledDates: SchedulingFormData[]) => {
    setIsLoading(true);
    try {
      // Get contractor ID
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (contractorError || !contractorData?.id) {
        throw new Error('Contractor not found');
      }

      // Create scheduled dates with generated IDs
      const scheduledDatesWithIds: ScheduledDate[] = scheduledDates.map(date => ({
        id: crypto.randomUUID(),
        date: date.date,
        startTime: date.startTime,
        endTime: date.endTime,
        status: 'scheduled' as const,
        notes: date.notes
      }));

      // Insert into job_schedules table - cast to Json for Supabase compatibility
      const { error: scheduleError } = await supabase
        .from('job_schedules')
        .insert({
          request_id: requestId,
          contractor_id: contractorData.id,
          scheduled_dates: scheduledDatesWithIds as any // Cast to avoid TypeScript Json type issues
        });

      if (scheduleError) {
        throw scheduleError;
      }

      // Update maintenance request status to indicate it's scheduled
      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'in-progress' // Keep as in-progress, not automatically "scheduled"
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      console.log('Job scheduled successfully');
    } catch (error) {
      console.error('Error scheduling job:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getJobSchedules = useCallback(async (contractorId?: string) => {
    try {
      let query = supabase
        .from('job_schedules')
        .select(`
          *,
          maintenance_requests (
            id,
            title,
            location,
            priority,
            status
          )
        `);

      if (contractorId) {
        query = query.eq('contractor_id', contractorId);
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching job schedules:', error);
      return [];
    }
  }, []);

  return {
    scheduleJob,
    getJobSchedules,
    isLoading
  };
};
