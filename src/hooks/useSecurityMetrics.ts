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
      const startOfTodayISO = startOfToday.toISOString();

      // Fetch auth logs from the last 48 hours for recent attempts
      const last48Hours = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      // For now, let's create mock data for the security dashboard
      // In a real implementation, you would integrate with Supabase Analytics API or auth logs
      const authLogs = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          event_message: { action: 'login', actor_username: 'admin@example.com', msg: 'Login successful' },
          level: 'info'
        },
        {
          id: '2', 
          timestamp: new Date(Date.now() - 60000).toISOString(),
          event_message: { action: 'login', actor_username: 'user@example.com', msg: 'Login failed' },
          level: 'error'
        }
      ];
      
      const authError = null;

      if (authError) {
        console.error('Error fetching auth logs:', authError);
        throw new Error('Failed to fetch security metrics');
      }

      // Process the auth logs
      const recentAttempts: LoginAttempt[] = [];
      let totalLoginsToday = 0;
      let failedLoginsToday = 0;
      let activeSessionsCount = 0;

      if (authLogs && Array.isArray(authLogs)) {
        authLogs.forEach((log: any) => {
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

          // Identify login attempts and sessions
          const msg = eventData.msg || log.msg || '';
          const isLogin = msg.toLowerCase().includes('login') || 
                         msg.toLowerCase().includes('signup') ||
                         eventData.action === 'login';
          
          const isSuccess = log.level === 'info' && !msg.toLowerCase().includes('error');
          const isFailed = log.level === 'error' || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed');

          if (isLogin) {
            // Count today's logins
            if (isToday) {
              totalLoginsToday++;
              if (isFailed) {
                failedLoginsToday++;
              }
            }

            // Add to recent attempts (last 48 hours)
            const email = eventData.actor_username || eventData.email || 'Unknown';
            recentAttempts.push({
              id: log.id,
              timestamp: log.timestamp,
              email: email,
              status: isFailed ? 'failed' : 'success',
              msg: msg,
              level: log.level || 'info'
            });
          }

          // Count active sessions (very rough estimate - successful logins in last hour)
          const lastHour = new Date(Date.now() - 60 * 60 * 1000);
          if (isLogin && isSuccess && logTime >= lastHour) {
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