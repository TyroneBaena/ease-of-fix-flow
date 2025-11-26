import { useState, useEffect, useCallback } from 'react';
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

  const fetchSecurityMetrics = useCallback(async () => {
    console.log('🔐 [useSecurityAnalytics] Starting fetchSecurityMetrics...');
    
    // Prevent rapid-fire calls - debounce with 5 second minimum interval
    const now = Date.now();
    const lastFetch = (fetchSecurityMetrics as any).lastFetchTime || 0;
    if (now - lastFetch < 5000) {
      console.log('🔐 [useSecurityAnalytics] Skipping fetch - too soon (debounced)');
      return;
    }
    (fetchSecurityMetrics as any).lastFetchTime = now;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 [Security Analytics] Fetching security metrics...');

      // Get current user session for active sessions count
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      try {
        const { data: response, error: functionError } = await supabase.functions.invoke('security-analytics', {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (functionError) {
          console.error('❌ [Security Analytics] Function error:', functionError);
          throw functionError;
        }

        if (!response?.success) {
          console.error('❌ [Security Analytics] API error:', response?.error);
          throw new Error(response?.error || 'Failed to fetch security metrics');
        }

        // Update metrics with real session count
        const updatedMetrics = {
          ...response.data,
          activeSessionsCount: session ? 1 : 0, // Real session count
        };

        console.log('✅ [Security Analytics] Successfully fetched metrics:', updatedMetrics);
        setMetrics(updatedMetrics);
        
      } catch (fetchError) {
        throw fetchError;
      }

    } catch (err) {
      console.error('❌ [Security Analytics] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security metrics');
      
      // Get real session count even on error
      const { data: { session } } = await supabase.auth.getSession();
      
      // Set fallback data on error
      setMetrics({
        activeSessionsCount: session ? 1 : 0,
        failedLoginsToday: 0,
        totalLoginsToday: 0,
        recentLoginAttempts: []
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Log security event helper function
  const logSecurityEvent = useCallback(async (
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
        p_user_agent: userAgent || navigator.userAgent || null,
        p_session_id: null,
        p_metadata: metadata || {}
      });
      
      console.log('🔐 [Security Analytics] Logged security event:', eventType);
      
      // Refresh metrics after logging
      setTimeout(fetchSecurityMetrics, 1000);
    } catch (error) {
      console.error('❌ [Security Analytics] Failed to log security event:', error);
    }
  }, [fetchSecurityMetrics]);

  // Removed duplicate auth listener - UnifiedAuthProvider handles auth state changes
  // Security events are logged only on explicit user actions, not on every SIGNED_IN event

  useEffect(() => {
    fetchSecurityMetrics();
    
    // Refresh metrics every 1 minute for real-time monitoring (changed from 30 seconds)
    const interval = setInterval(fetchSecurityMetrics, 60 * 1000);
    
    // Set up real-time subscription for security events
    const channel = supabase
      .channel('security-events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'security_events'
        },
        (payload) => {
          console.log('🔄 [Security Analytics] Real-time update:', payload);
          // Refresh metrics when security events change
          fetchSecurityMetrics();
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchSecurityMetrics]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchSecurityMetrics,
    logSecurityEvent
  };
};