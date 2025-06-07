
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

      // Fetch maintenance requests assigned to this contractor
      const { data: requests, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', contractorData.id)
        .in('status', ['in-progress', 'pending'])
        .order('created_at', { ascending: true });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        throw requestsError;
      }

      // Transform requests into schedule items
      const items: ScheduleItem[] = requests.map((request) => {
        // Generate a future date for demonstration (in real app, this would come from a scheduled_date field)
        const baseDate = new Date();
        const daysToAdd = Math.floor(Math.random() * 14) + 1; // 1-14 days from now
        const scheduledDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        
        // Generate a time slot
        const hours = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
        const minutes = Math.random() < 0.5 ? '00' : '30';
        const time = `${hours.toString().padStart(2, '0')}:${minutes}`;

        return {
          id: request.id,
          date: scheduledDate.toISOString().split('T')[0],
          time: time,
          task: `${request.category} - ${request.title}`,
          location: request.location,
          status: request.status === 'in-progress' ? 'scheduled' as const : 'tentative' as const,
          requestId: request.id,
          priority: request.priority
        };
      });

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
