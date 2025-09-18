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
      
      console.log('🔍 [Security] Fetching live security metrics...', new Date().toISOString());

      // Get today's date range in UTC
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      console.log('🕐 [Security] Date range for today:', {
        startOfToday: startOfToday.toISOString(),
        endOfToday: endOfToday.toISOString(),
        currentTime: today.toISOString()
      });

      let finalAuthLogs = null;
      let authError = null;

      // Fetch live auth logs from edge function
      try {
        console.log('🔍 [Security] Calling get-auth-logs edge function...');
        const { data: authLogsResponse, error: functionError } = await supabase.functions.invoke('get-auth-logs', {
          body: { hours: 48 }
        });

        console.log('🔍 [Security] Edge function response:', { 
          success: authLogsResponse?.success, 
          dataLength: authLogsResponse?.data?.length,
          error: functionError 
        });

        if (functionError) {
          console.error('🚨 [Security] Edge function error:', functionError);
          authError = functionError;
        } else if (authLogsResponse?.success && authLogsResponse?.data) {
          finalAuthLogs = authLogsResponse.data;
          console.log('✅ [Security] Successfully fetched auth logs from edge function:', finalAuthLogs.length);
        } else {
          console.error('🚨 [Security] Invalid response from edge function:', authLogsResponse);
          authError = new Error(authLogsResponse?.error || 'Invalid response from auth logs service');
        }
      } catch (functionErr) {
        console.error('🚨 [Security] Edge function call failed:', functionErr);
        authError = functionErr;
      }

      // Fallback to empty array if no data
      if (!finalAuthLogs || authError) {
        console.log('⚠️ [Security] No auth logs available, using empty dataset');
        finalAuthLogs = [];
      }

      if (authError) {
        console.error('Error fetching auth logs:', authError);
        throw new Error('Failed to fetch security metrics');
      }

      // Process the auth logs
      const recentAttempts: LoginAttempt[] = [];
      let totalLoginsToday = 0;
      let failedLoginsToday = 0;
      let activeSessionsCount = 1; // Always at least 1 (current user)

      console.log('🔍 [Security] Processing auth logs:', finalAuthLogs?.length || 0);
      console.log('🔍 [Security] Sample auth log:', finalAuthLogs?.[0]);

      if (finalAuthLogs && Array.isArray(finalAuthLogs) && finalAuthLogs.length > 0) {
        finalAuthLogs.forEach((log: any, index: number) => {
          // Handle timestamp - it might be in microseconds or milliseconds
          let logDate: Date;
          if (log.timestamp) {
            // Convert microsecond timestamp to milliseconds if needed
            const timestamp = typeof log.timestamp === 'string' ? parseInt(log.timestamp) : log.timestamp;
            if (timestamp > 1e12) {
              // Microseconds - divide by 1000
              logDate = new Date(timestamp / 1000);
            } else {
              // Milliseconds or seconds
              logDate = new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
            }
          } else if (log.event_message) {
            // Try to extract time from event_message
            try {
              const eventData = typeof log.event_message === 'string' 
                ? JSON.parse(log.event_message) 
                : log.event_message;
              if (eventData.time) {
                logDate = new Date(eventData.time);
              } else {
                logDate = new Date();
              }
            } catch (e) {
              logDate = new Date();
            }
          } else {
            logDate = new Date();
          }
          
          // Check if the log is from today using local timezone
          const logDateString = logDate.toDateString();
          const todayString = today.toDateString();
          const isToday = logDateString === todayString;
          
          console.log(`🕐 [Security] Log ${index} timestamp processing:`, {
            originalTimestamp: log.timestamp,
            convertedTimestamp: log.timestamp ? (log.timestamp > 1e12 ? log.timestamp / 1000 : log.timestamp) : 'none',
            parsedDate: logDate.toISOString(),
            logDateString,
            todayString,
            isToday,
            logTime: logDate.getTime(),
            todayTime: today.getTime()
          });
          
          // Parse event message to extract details
          let eventData: any = {};
          try {
            eventData = typeof log.event_message === 'string' 
              ? JSON.parse(log.event_message) 
              : (log.event_message || {});
          } catch (e) {
            eventData = { msg: log.msg || 'Unknown event' };
          }

          console.log(`🔍 [Security] Processing log ${index}:`, {
            timestamp: log.timestamp,
            path: eventData.path || log.path,
            status: eventData.status || log.status,
            grant_type: eventData.grant_type,
            isToday
          });

          // Detect login attempts: multiple ways to identify them
          const isTokenRequest = (eventData.path === '/token' || log.path === '/token');
          const isPasswordGrant = eventData.grant_type === 'password';
          const isLoginAction = eventData.action === 'login' || (eventData.auth_event && eventData.auth_event.action === 'login');
          const hasLoginMsg = (log.msg && log.msg.toLowerCase().includes('login')) || (eventData.msg && eventData.msg.toLowerCase().includes('login'));
          
          const isLoginAttempt = (isTokenRequest && isPasswordGrant) || isLoginAction || hasLoginMsg;
          
          if (isLoginAttempt) {
            const status = eventData.status || log.status;
            const isFailed = status === 400 || status === '400' || eventData.error_code === 'invalid_credentials' || 
                           (eventData.level === 'error') || (log.level === 'error');
            const isSuccess = status === 200 || status === '200' || status === 204 || status === '204' || 
                            (!isFailed && (isLoginAction || hasLoginMsg));
            
            if (isToday) {
              totalLoginsToday++;
              if (isFailed) {
                failedLoginsToday++;
              }
            }

            // Extract email for display
            let email = 'Unknown User';
            if (eventData.auth_event?.actor_username) {
              email = eventData.auth_event.actor_username;
            } else if (eventData.actor_username) {
              email = eventData.actor_username;
            }
            
            // Add to recent attempts (limit to last 50)
            if (recentAttempts.length < 50) {
              recentAttempts.push({
                id: log.id || `log-${index}`,
                timestamp: logDate.toISOString(),
                email: email,
                status: isFailed ? 'failed' : 'success',
                msg: isFailed ? 'Login failed - Invalid credentials' : 'Login successful',
                level: log.level || 'info'
              });
            }

            console.log(`📊 [Security] Login attempt processed:`, {
              email,
              status: isFailed ? 'failed' : 'success',
              isToday,
              totalToday: totalLoginsToday,
              failedToday: failedLoginsToday
            });
          }
        });
      }

      const newMetrics = {
        activeSessionsCount: Math.max(activeSessionsCount, 1), // At least 1 (current user)
        failedLoginsToday,
        totalLoginsToday,
        recentLoginAttempts: recentAttempts.slice(0, 50) // Limit to 50 most recent
      };
      
      console.log('🔢 [Security] Computed metrics:', {
        activeSessionsCount: newMetrics.activeSessionsCount,
        failedLoginsToday,
        totalLoginsToday,
        recentAttempts: recentAttempts.length
      });
      
      console.log('🔄 [Security] Setting metrics state...', newMetrics);
      setMetrics(newMetrics);
      console.log('✅ [Security] Metrics state updated!');

    } catch (err) {
      console.error('Error fetching security metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityMetrics();
    
    // Refresh metrics every 30 seconds for real-time updates
    const interval = setInterval(fetchSecurityMetrics, 30 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    loading,
    error,
    refetch: fetchSecurityMetrics
  };
};