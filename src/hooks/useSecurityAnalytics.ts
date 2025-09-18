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
  ip_address?: string;
  metadata?: any;
}

export const useSecurityAnalytics = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    activeSessionsCount: 1,
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
      
      console.log('🔐 [Security Analytics] Fetching security metrics...');

      // Call the security analytics edge function
      const { data: response, error: functionError } = await supabase.functions.invoke('security-analytics');

      if (functionError) {
        console.error('❌ [Security Analytics] Function error:', functionError);
        throw functionError;
      }

      if (!response?.success) {
        console.error('❌ [Security Analytics] API error:', response?.error);
        throw new Error(response?.error || 'Failed to fetch security metrics');
      }

      console.log('✅ [Security Analytics] Successfully fetched metrics:', response.data);
      setMetrics(response.data);

    } catch (err) {
      console.error('❌ [Security Analytics] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security metrics');
      
      // Set fallback data on error
      setMetrics({
        activeSessionsCount: 1,
        failedLoginsToday: 0,
        totalLoginsToday: 0,
        recentLoginAttempts: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Log security event helper function
  const logSecurityEvent = async (
    eventType: string,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_user_id: user?.id || null,
        p_user_email: userEmail || user?.email || null,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null,
        p_session_id: null,
        p_metadata: metadata || {}
      });
      
      console.log('🔐 [Security Analytics] Logged security event:', eventType);
    } catch (error) {
      console.error('❌ [Security Analytics] Failed to log security event:', error);
    }
  };

  useEffect(() => {
    fetchSecurityMetrics();
    
    // Refresh metrics every 30 seconds for real-time monitoring
    const interval = setInterval(fetchSecurityMetrics, 30 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    loading,
    error,
    refetch: fetchSecurityMetrics,
    logSecurityEvent
  };
};