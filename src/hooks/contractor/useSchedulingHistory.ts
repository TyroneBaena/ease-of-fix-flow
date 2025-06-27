
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

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

// Helper function to convert Json to array
const convertJsonToArray = (jsonData: Json): any[] => {
  if (Array.isArray(jsonData)) {
    return jsonData;
  }
  if (jsonData === null || jsonData === undefined) {
    return [];
  }
  // If it's a string, try to parse it
  if (typeof jsonData === 'string') {
    try {
      const parsed = JSON.parse(jsonData);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  // If it's an object, wrap it in an array
  if (typeof jsonData === 'object') {
    return [jsonData];
  }
  return [];
};

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

      // Convert the data to match our interface
      const convertedHistory: SchedulingHistoryItem[] = (data || []).map(item => ({
        ...item,
        scheduled_dates: convertJsonToArray(item.scheduled_dates)
      }));

      setHistory(convertedHistory);
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
