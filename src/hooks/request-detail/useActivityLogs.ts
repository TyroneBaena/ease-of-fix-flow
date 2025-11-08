
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/integrations/supabase/types';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

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
  // CRITICAL: Track if we've completed initial load to prevent loading flashes
  const hasCompletedInitialLoadRef = useRef(false);

  // v77.0: CRITICAL FIX - Subscribe to coordinator's instant reset
  useEffect(() => {
    const unsubscribe = visibilityCoordinator.onTabRefreshChange((isRefreshing) => {
      if (!isRefreshing && hasCompletedInitialLoadRef.current) {
        // Instant reset: Clear loading immediately on tab return
        console.log('⚡ v77.0 - ActivityLogs - Instant loading reset from coordinator');
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Smart Retry: Detect when isSessionReady transitions from false to true
    const sessionJustBecameReady = !previousSessionReadyRef.current && isSessionReady;
    previousSessionReadyRef.current = isSessionReady;
    
    const fetchActivityLogs = async () => {
      // CRITICAL: Wait for session to be ready before querying
      if (!isSessionReady) {
        console.log('🔄 useActivityLogs - Waiting for session to be ready...');
        setLoading(true);
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
        // v77.1: CRITICAL - NEVER set loading after initial load
        // Background refreshes must be completely silent
        if (!hasCompletedInitialLoadRef.current) {
          setLoading(true);
        } else {
          console.log('🔕 v77.1 - ActivityLogs - SILENT REFRESH - Skipping loading state');
        }
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
        // CRITICAL: Only reset loading on first load, keep it false after
        if (!hasCompletedInitialLoadRef.current) {
          setLoading(false);
        }
        hasCompletedInitialLoadRef.current = true;
      }
    };

    fetchActivityLogs();
  }, [requestId, refreshCounter, isSessionReady]); // Add isSessionReady to deps

  return { 
    activityLogs, 
    // CRITICAL: Override loading to false after initial load completes
    loading: hasCompletedInitialLoadRef.current ? false : loading 
  };
};
