import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { subDays, subHours, format } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  event_type: string;
  event_name: string;
  metadata: any;
  created_at: string;
}

interface UserActivity {
  userId: string;
  userName: string;
  userEmail: string;
  actionCount: number;
  lastActive: string;
}

interface PageUsage {
  pageName: string;
  viewCount: number;
}

interface FeatureUsage {
  featureName: string;
  usageCount: number;
}

interface HourlyActivity {
  hour: string;
  count: number;
}

export interface AppActivityAnalytics {
  loading: boolean;
  error: string | null;
  totalActions: number;
  activeUsersCount: number;
  mostActiveUsers: UserActivity[];
  pageUsage: PageUsage[];
  featureUsage: FeatureUsage[];
  recentActivity: ActivityLog[];
  hourlyActivity: HourlyActivity[];
  refetch: () => Promise<void>;
}

export const useAppActivityAnalytics = (timeRangeDays: number = 7): AppActivityAnalytics => {
  const { currentUser, isAdmin } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const fetchData = useCallback(async () => {
    if (!currentUser || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDate = subDays(new Date(), timeRangeDays);
      
      const { data, error: fetchError } = await supabase
        .from('app_activity_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (fetchError) throw fetchError;

      setActivityLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching activity analytics:', err);
      setError(err.message || 'Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, isAdmin, timeRangeDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analytics = useMemo(() => {
    // Total actions
    const totalActions = activityLogs.length;

    // Active users count
    const uniqueUsers = new Set(activityLogs.map(log => log.user_id));
    const activeUsersCount = uniqueUsers.size;

    // Most active users
    const userActionCounts: Record<string, { count: number; name: string; email: string; lastActive: string }> = {};
    activityLogs.forEach(log => {
      if (!userActionCounts[log.user_id]) {
        userActionCounts[log.user_id] = {
          count: 0,
          name: log.user_name,
          email: log.user_email,
          lastActive: log.created_at
        };
      }
      userActionCounts[log.user_id].count++;
      // Update last active if this log is more recent
      if (new Date(log.created_at) > new Date(userActionCounts[log.user_id].lastActive)) {
        userActionCounts[log.user_id].lastActive = log.created_at;
      }
    });

    const mostActiveUsers: UserActivity[] = Object.entries(userActionCounts)
      .map(([userId, data]) => ({
        userId,
        userName: data.name,
        userEmail: data.email,
        actionCount: data.count,
        lastActive: data.lastActive
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    // Page usage
    const pageViewLogs = activityLogs.filter(log => log.event_type === 'page_view');
    const pageCounts: Record<string, number> = {};
    pageViewLogs.forEach(log => {
      pageCounts[log.event_name] = (pageCounts[log.event_name] || 0) + 1;
    });

    const pageUsage: PageUsage[] = Object.entries(pageCounts)
      .map(([pageName, viewCount]) => ({ pageName, viewCount }))
      .sort((a, b) => b.viewCount - a.viewCount);

    // Feature usage
    const featureLogs = activityLogs.filter(log => log.event_type === 'feature_used');
    const featureCounts: Record<string, number> = {};
    featureLogs.forEach(log => {
      featureCounts[log.event_name] = (featureCounts[log.event_name] || 0) + 1;
    });

    const featureUsage: FeatureUsage[] = Object.entries(featureCounts)
      .map(([featureName, usageCount]) => ({ featureName, usageCount }))
      .sort((a, b) => b.usageCount - a.usageCount);

    // Recent activity (last 20)
    const recentActivity = activityLogs.slice(0, 20);

    // Hourly activity for last 24 hours
    const last24Hours = subHours(new Date(), 24);
    const hourlyLogs = activityLogs.filter(log => new Date(log.created_at) >= last24Hours);
    const hourlyCounts: Record<string, number> = {};
    
    hourlyLogs.forEach(log => {
      const hour = format(new Date(log.created_at), 'HH:00');
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

    const hourlyActivity: HourlyActivity[] = Object.entries(hourlyCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return {
      totalActions,
      activeUsersCount,
      mostActiveUsers,
      pageUsage,
      featureUsage,
      recentActivity,
      hourlyActivity
    };
  }, [activityLogs]);

  return {
    loading,
    error,
    ...analytics,
    refetch: fetchData
  };
};
