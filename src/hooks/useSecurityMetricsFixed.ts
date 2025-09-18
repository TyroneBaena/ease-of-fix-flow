import { useState, useEffect } from 'react';

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
      
      console.log('🔍 [Security] Generating realistic demo data...');
      
      // Generate realistic demo data for today
      const now = new Date();
      const recentAttempts: LoginAttempt[] = [
        {
          id: 'demo-1',
          timestamp: new Date(now.getTime() - 300000).toISOString(), // 5 minutes ago
          email: 'ostrich06762@mailshan.com',
          status: 'success',
          msg: 'Login successful',
          level: 'info'
        },
        {
          id: 'demo-2',
          timestamp: new Date(now.getTime() - 900000).toISOString(), // 15 minutes ago
          email: 'ostrich06762@mailshan.com',
          status: 'success',
          msg: 'Login successful',
          level: 'info'
        },
        {
          id: 'demo-3',
          timestamp: new Date(now.getTime() - 1800000).toISOString(), // 30 minutes ago
          email: 'ostrich06762@mailshan.com',
          status: 'failed',
          msg: 'Login failed - Invalid credentials',
          level: 'error'
        },
        {
          id: 'demo-4',
          timestamp: new Date(now.getTime() - 2700000).toISOString(), // 45 minutes ago
          email: 'ostrich06762@mailshan.com',
          status: 'success',
          msg: 'Login successful',
          level: 'info'
        },
        {
          id: 'demo-5',
          timestamp: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
          email: 'ostrich06762@mailshan.com',
          status: 'success',
          msg: 'Login successful',
          level: 'info'
        }
      ];

      const totalLoginsToday = recentAttempts.length;
      const failedLoginsToday = recentAttempts.filter(attempt => attempt.status === 'failed').length;
      const activeSessionsCount = 1; // Current user session

      const newMetrics = {
        activeSessionsCount,
        failedLoginsToday,
        totalLoginsToday,
        recentLoginAttempts: recentAttempts
      };
      
      console.log('🔢 [Security] Demo metrics:', newMetrics);
      setMetrics(newMetrics);

    } catch (err) {
      console.error('Error generating security metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate security metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityMetrics();
    
    // Refresh metrics every 30 seconds
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