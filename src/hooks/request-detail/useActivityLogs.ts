
import { useState, useEffect, useRef } from 'react';
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

export const useActivityLogs = (
  requestId: string | undefined, 
  refreshCounter: number = 0,
  isSessionReady?: boolean
) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const previousSessionReadyRef = useRef(isSessionReady);

  useEffect(() => {
    // Smart Retry: Detect when isSessionReady transitions from false to true
    const sessionJustBecameReady = !previousSessionReadyRef.current && isSessionReady;
    previousSessionReadyRef.current = isSessionReady;
    
    const fetchActivityLogs = async () => {
      // CRITICAL: Wait for session to be ready before querying
      if (!isSessionReady) {
        console.log('🔄 v77.2 - useActivityLogs - Waiting for session to be ready...');
        // v77.2: NEVER set loading when waiting for session
        return;
      }
      
      if (sessionJustBecameReady) {
        console.log('✅ useActivityLogs - Session became ready, triggering fetch');
      }
      
      if (!requestId) {
        setLoading(false);
        return;
      }

      // Reduced timeout now that we wait for session
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
  }, [requestId, refreshCounter, isSessionReady]); // Add isSessionReady to deps

  return { 
    activityLogs, 
    loading 
  };
};
