import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  activeSessionsCount: number;
  failedLoginsToday: number;
  totalLoginsToday: number;
  recentLoginAttempts: LoginAttempt[];
}

interface LoginAttempt {
  id: string;
  timestamp: string;
  email: string;
  status: 'success' | 'failed';
  msg: string;
  level: string;
}

export const useSecurityMetrics = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    activeSessionsCount: 0,
    failedLoginsToday: 0,
    totalLoginsToday: 0,
    recentLoginAttempts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date range
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Fetch auth logs from the last 48 hours for recent attempts
      const last48Hours = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      // Call the edge function to get auth logs
      const { data: authLogsResponse, error: functionError } = await supabase.functions.invoke('get-auth-logs', {
        body: { hours: 48 }
      });

      let finalAuthLogs = null;
      let authError = null;

      if (functionError) {
        console.error('Edge function error:', functionError);
        authError = functionError;
      } else if (authLogsResponse?.success) {
        finalAuthLogs = authLogsResponse.data;
      } else {
        authError = new Error(authLogsResponse?.error || 'Failed to fetch auth logs');
      }

      if (authError) {
        console.error('Error fetching auth logs:', authError);
        throw new Error('Failed to fetch security metrics');
      }

      // Process the auth logs
      const recentAttempts: LoginAttempt[] = [];
      let totalLoginsToday = 0;
      let failedLoginsToday = 0;
      let activeSessionsCount = 0;

      if (finalAuthLogs && Array.isArray(finalAuthLogs)) {
        finalAuthLogs.forEach((log: any) => {
          const logTime = new Date(log.timestamp);
          const isToday = logTime >= startOfToday;
          
          // Parse event message to extract email and action
          let eventData: any = {};
          try {
            eventData = typeof log.event_message === 'string' 
              ? JSON.parse(log.event_message) 
              : log.event_message;
          } catch (e) {
            eventData = { msg: log.msg || 'Unknown event' };
          }

          // Identify login attempts and sessions with better logic
          const msg = eventData.msg || log.msg || '';
          const path = eventData.path || '';
          const status = eventData.status || log.status;
          
          // Check for auth-related events
          const isAuthEvent = eventData.auth_event || 
                             eventData.action === 'login' || 
                             eventData.action === 'logout' ||
                             msg.toLowerCase().includes('login') || 
                             msg.toLowerCase().includes('signup') ||
                             path === '/token' ||
                             (path === '/logout' && eventData.auth_event?.action === 'logout');
          
          // Determine success/failure status
          const isSuccess = (log.level === 'info' && status === '200') || 
                           (eventData.action === 'login' && !eventData.error);
          const isFailed = log.level === 'error' || 
                          status === '400' || 
                          eventData.error_code === 'invalid_credentials' ||
                          msg.toLowerCase().includes('invalid') ||
                          msg.toLowerCase().includes('failed');

          // Extract email with better logic
          let email = 'Unknown';
          if (eventData.auth_event?.actor_username) {
            email = eventData.auth_event.actor_username;
          } else if (eventData.actor_username) {
            email = eventData.actor_username;
          } else if (eventData.email) {
            email = eventData.email;
          }

          if (isAuthEvent) {
            // Count today's logins (only actual login events, not token refresh)
            if (isToday && (eventData.action === 'login' || path === '/token')) {
              totalLoginsToday++;
              if (isFailed) {
                failedLoginsToday++;
              }
            }

            // Add to recent attempts (all auth events for visibility)
            const attemptType = eventData.action || 
                               (path === '/token' ? 'login' : 
                                path === '/logout' ? 'logout' : 'auth');
                                
            recentAttempts.push({
              id: log.id,
              timestamp: log.timestamp,
              email: email,
              status: isFailed ? 'failed' : 'success',
              msg: `${attemptType} - ${msg}`,
              level: log.level || 'info'
            });
          }

          // Count active sessions (very rough estimate - successful auth events in last hour)
          const lastHour = new Date(Date.now() - 60 * 60 * 1000);
          if (isAuthEvent && isSuccess && logTime >= lastHour && eventData.action === 'login') {
            activeSessionsCount++;
          }
        });
      }

      setMetrics({
        activeSessionsCount: Math.max(activeSessionsCount, 1), // At least 1 (current user)
        failedLoginsToday,
        totalLoginsToday,
        recentLoginAttempts: recentAttempts.slice(0, 20) // Limit to 20 most recent
      });

    } catch (err) {
      console.error('Error fetching security metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityMetrics();
    
    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchSecurityMetrics, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    loading,
    error,
    refetch: fetchSecurityMetrics
  };
};