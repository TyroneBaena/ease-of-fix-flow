
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/integrations/supabase/types';

export interface ActivityLog {
  id: string;
  request_id: string;
  action_type: string;
  description: string;
  actor_name: string | null;
  actor_role: string | null;
  metadata: Json | null;
  created_at: string;
}

export const useActivityLogs = (requestId: string | undefined, refreshCounter: number = 0) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivityLogs = async () => {
      if (!requestId) {
        setLoading(false);
        return;
      }

      // CRITICAL FIX: Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('Activity logs fetch timeout after 10s');
      }, 10000);

      try {
        setLoading(true);
        console.log('Fetching activity logs for request:', requestId);

        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false });

        clearTimeout(timeoutId);

        if (error) {
          console.error('Error fetching activity logs:', error);
          return;
        }

        console.log('Activity logs fetched:', data);
        setActivityLogs(data || []);
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (controller.signal.aborted) {
          console.warn('Activity logs fetch aborted due to timeout');
        } else {
          console.error('Error in fetchActivityLogs:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActivityLogs();
  }, [requestId, refreshCounter]);

  return { activityLogs, loading };
};
