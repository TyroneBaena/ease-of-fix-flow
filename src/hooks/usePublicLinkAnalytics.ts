import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';

interface PublicLinkAccessLog {
  id: string;
  organization_id: string;
  property_id: string;
  property_name: string | null;
  access_type: 'page_view' | 'request_submitted';
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface PropertyAccess {
  propertyName: string;
  propertyId: string;
  pageViews: number;
  submissions: number;
}

export interface PublicLinkAnalytics {
  loading: boolean;
  error: string | null;
  totalPageViews: number;
  totalSubmissions: number;
  uniqueVisitors: number;
  mostAccessedProperties: PropertyAccess[];
  recentActivity: PublicLinkAccessLog[];
  refetch: () => Promise<void>;
}

export const usePublicLinkAnalytics = (): PublicLinkAnalytics => {
  const { currentUser } = useSimpleAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<PublicLinkAccessLog[]>([]);

  const fetchData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch last 7 days of public link access logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error: fetchError } = await supabase
        .from('public_link_access_logs')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (fetchError) {
        console.error('Error fetching public link analytics:', fetchError);
        setError(fetchError.message);
        return;
      }

      setLogs((data as PublicLinkAccessLog[]) || []);
    } catch (err) {
      console.error('Error in usePublicLinkAnalytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analytics = useMemo(() => {
    const totalPageViews = logs.filter(log => log.access_type === 'page_view').length;
    const totalSubmissions = logs.filter(log => log.access_type === 'request_submitted').length;

    // Calculate unique visitors by IP address
    const uniqueIps = new Set(logs.map(log => log.ip_address).filter(Boolean));
    const uniqueVisitors = uniqueIps.size;

    // Aggregate by property
    const propertyMap = new Map<string, PropertyAccess>();
    logs.forEach(log => {
      const key = log.property_id;
      const existing = propertyMap.get(key) || {
        propertyId: log.property_id,
        propertyName: log.property_name || 'Unknown Property',
        pageViews: 0,
        submissions: 0
      };

      if (log.access_type === 'page_view') {
        existing.pageViews++;
      } else if (log.access_type === 'request_submitted') {
        existing.submissions++;
      }

      propertyMap.set(key, existing);
    });

    // Sort by total access count (page views + submissions)
    const mostAccessedProperties = Array.from(propertyMap.values())
      .sort((a, b) => (b.pageViews + b.submissions) - (a.pageViews + a.submissions))
      .slice(0, 10);

    // Get recent activity (last 20)
    const recentActivity = logs.slice(0, 20);

    return {
      totalPageViews,
      totalSubmissions,
      uniqueVisitors,
      mostAccessedProperties,
      recentActivity
    };
  }, [logs]);

  return {
    loading,
    error,
    ...analytics,
    refetch: fetchData
  };
};
