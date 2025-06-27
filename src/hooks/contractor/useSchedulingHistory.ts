
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SchedulingHistoryItem {
  id: string;
  request_id: string;
  contractor_id: string;
  action: string;
  scheduled_dates: any[];
  notes?: string;
  created_by: string;
  created_at: string;
}

export const useSchedulingHistory = (requestId: string | null) => {
  const [history, setHistory] = useState<SchedulingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_scheduling_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching scheduling history:', error);
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching scheduling history:', error);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const addHistoryEntry = useCallback(async (
    contractorId: string,
    action: string,
    scheduledDates: any[],
    notes?: string
  ) => {
    if (!requestId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('job_scheduling_history')
        .insert({
          request_id: requestId,
          contractor_id: contractorId,
          action,
          scheduled_dates: scheduledDates,
          notes,
          created_by: user.user.id
        });

      if (error) {
        console.error('Error adding scheduling history:', error);
        return;
      }

      // Refresh history after adding
      await fetchHistory();
    } catch (error) {
      console.error('Error adding scheduling history:', error);
    }
  }, [requestId, fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    fetchHistory,
    addHistoryEntry
  };
};
