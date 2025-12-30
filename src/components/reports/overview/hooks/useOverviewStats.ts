import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, format, getDay } from 'date-fns';

interface MonthlyTrend {
  month: string;
  requests: number;
}

interface PropertyStats {
  id: string;
  name: string;
  requests: number;
}

interface TimeInsights {
  thisMonth: number;
  lastMonth: number;
  thisWeek: number;
  lastWeek: number;
  peakDays: { day: string; count: number }[];
}

interface LifecycleMetrics {
  avgTimeToAssign: number;
  avgTimeToComplete: number;
  avgTotalResolution: number;
  completedCount: number;
  assignedCount: number;
}

interface ContractorStats {
  id: string;
  name: string;
  totalAssigned: number;
  completedCount: number;
  completionRate: number;
  avgResponseTime: number;
}

interface SubmissionMethodStats {
  form: number;
  ai_assistant: number;
  public_form: number;
  public_ai_assistant: number;
}

interface OverviewStats {
  loading: boolean;
  error: string | null;
  monthlyTrends: MonthlyTrend[];
  topProperties: PropertyStats[];
  timeInsights: TimeInsights;
  lifecycleMetrics: LifecycleMetrics;
  contractorStats: ContractorStats[];
  submissionMethodStats: SubmissionMethodStats;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const useOverviewStats = (): OverviewStats => {
  const { currentUser, isAdmin } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch maintenance requests from last 6 months
        const sixMonthsAgo = subMonths(new Date(), 6);
        
        let requestsQuery = supabase
          .from('maintenance_requests')
          .select('id, created_at, property_id, assigned_at, status, contractor_id, submission_method')
          .gte('created_at', sixMonthsAgo.toISOString());

        // Apply role-based filtering
        if (!isAdmin && currentUser.assignedProperties?.length > 0) {
          requestsQuery = requestsQuery.in('property_id', currentUser.assignedProperties);
        }

        const [requestsResult, propertiesResult, logsResult, contractorsResult] = await Promise.all([
          requestsQuery,
          supabase.from('properties').select('id, name'),
          supabase
            .from('activity_logs')
            .select('request_id, action_type, created_at')
            .eq('action_type', 'job_completed')
            .gte('created_at', sixMonthsAgo.toISOString()),
          supabase.from('contractors').select('id, company_name, contact_name')
        ]);

        if (requestsResult.error) throw requestsResult.error;
        if (propertiesResult.error) throw propertiesResult.error;
        if (logsResult.error) throw logsResult.error;
        if (contractorsResult.error) throw contractorsResult.error;

        setRequests(requestsResult.data || []);
        setProperties(propertiesResult.data || []);
        setActivityLogs(logsResult.data || []);
        setContractors(contractorsResult.data || []);
      } catch (err: any) {
        console.error('Error fetching overview stats:', err);
        setError(err.message || 'Failed to load overview statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id, isAdmin]);

  const monthlyTrends = useMemo((): MonthlyTrend[] => {
    const now = new Date();
    const trends: MonthlyTrend[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM');

      const count = requests.filter(req => {
        const createdAt = new Date(req.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      trends.push({ month: monthLabel, requests: count });
    }

    return trends;
  }, [requests]);

  const topProperties = useMemo((): PropertyStats[] => {
    const propertyCounts: Record<string, number> = {};

    requests.forEach(req => {
      if (req.property_id) {
        propertyCounts[req.property_id] = (propertyCounts[req.property_id] || 0) + 1;
      }
    });

    const propertyMap = new Map(properties.map(p => [p.id, p.name]));

    return Object.entries(propertyCounts)
      .map(([id, count]) => ({
        id,
        name: propertyMap.get(id) || 'Unknown Property',
        requests: count
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);
  }, [requests, properties]);

  const timeInsights = useMemo((): TimeInsights => {
    const now = new Date();
    
    // This month vs last month
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonth = requests.filter(req => {
      const d = new Date(req.created_at);
      return d >= thisMonthStart && d <= thisMonthEnd;
    }).length;

    const lastMonth = requests.filter(req => {
      const d = new Date(req.created_at);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).length;

    // This week vs last week
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const thisWeek = requests.filter(req => {
      const d = new Date(req.created_at);
      return d >= thisWeekStart && d <= thisWeekEnd;
    }).length;

    const lastWeek = requests.filter(req => {
      const d = new Date(req.created_at);
      return d >= lastWeekStart && d <= lastWeekEnd;
    }).length;

    // Peak days analysis
    const dayCounts: Record<number, number> = {};
    requests.forEach(req => {
      const dayOfWeek = getDay(new Date(req.created_at));
      dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;
    });

    const peakDays = DAY_NAMES.map((day, index) => ({
      day: day.slice(0, 3),
      count: dayCounts[index] || 0
    }));

    return { thisMonth, lastMonth, thisWeek, lastWeek, peakDays };
  }, [requests]);

  const lifecycleMetrics = useMemo((): LifecycleMetrics => {
    // Calculate time to assign (for requests that have assigned_at)
    const assignedRequests = requests.filter(req => req.assigned_at);
    const timeToAssignValues = assignedRequests.map(req => {
      const created = new Date(req.created_at).getTime();
      const assigned = new Date(req.assigned_at).getTime();
      return (assigned - created) / (1000 * 60 * 60); // hours
    });
    const avgTimeToAssign = timeToAssignValues.length > 0
      ? timeToAssignValues.reduce((a, b) => a + b, 0) / timeToAssignValues.length
      : 0;

    // Create a map of completion times from activity logs
    const completionMap = new Map<string, Date>();
    activityLogs.forEach(log => {
      if (log.action_type === 'job_completed' && log.request_id) {
        completionMap.set(log.request_id, new Date(log.created_at));
      }
    });

    // Calculate time to complete (from assigned_at to job_completed)
    const completedRequests = requests.filter(req => 
      req.assigned_at && completionMap.has(req.id)
    );
    const timeToCompleteValues = completedRequests.map(req => {
      const assigned = new Date(req.assigned_at).getTime();
      const completed = completionMap.get(req.id)!.getTime();
      return (completed - assigned) / (1000 * 60 * 60); // hours
    });
    const avgTimeToComplete = timeToCompleteValues.length > 0
      ? timeToCompleteValues.reduce((a, b) => a + b, 0) / timeToCompleteValues.length
      : 0;

    // Calculate total resolution time (from created_at to job_completed)
    const totalResolutionValues = completedRequests.map(req => {
      const created = new Date(req.created_at).getTime();
      const completed = completionMap.get(req.id)!.getTime();
      return (completed - created) / (1000 * 60 * 60); // hours
    });
    const avgTotalResolution = totalResolutionValues.length > 0
      ? totalResolutionValues.reduce((a, b) => a + b, 0) / totalResolutionValues.length
      : 0;

    return {
      avgTimeToAssign,
      avgTimeToComplete,
      avgTotalResolution,
      completedCount: completedRequests.length,
      assignedCount: assignedRequests.length
    };
  }, [requests, activityLogs]);

  const contractorStats = useMemo((): ContractorStats[] => {
    // Create a map of completion times from activity logs
    const completionMap = new Map<string, Date>();
    activityLogs.forEach(log => {
      if (log.action_type === 'job_completed' && log.request_id) {
        completionMap.set(log.request_id, new Date(log.created_at));
      }
    });

    // Group requests by contractor
    const contractorMap = new Map<string, { assigned: any[], completed: any[] }>();
    
    requests.forEach(req => {
      if (req.contractor_id) {
        if (!contractorMap.has(req.contractor_id)) {
          contractorMap.set(req.contractor_id, { assigned: [], completed: [] });
        }
        const data = contractorMap.get(req.contractor_id)!;
        data.assigned.push(req);
        if (completionMap.has(req.id)) {
          data.completed.push({ ...req, completedAt: completionMap.get(req.id) });
        }
      }
    });

    // Create contractor name map
    const contractorNames = new Map(
      contractors.map(c => [c.id, c.company_name || c.contact_name])
    );

    // Calculate stats for each contractor
    return Array.from(contractorMap.entries())
      .map(([id, data]) => {
        const totalAssigned = data.assigned.length;
        const completedCount = data.completed.length;
        const completionRate = totalAssigned > 0 ? (completedCount / totalAssigned) * 100 : 0;

        // Calculate avg response time (from assigned_at to completion)
        const responseTimes = data.completed
          .filter(req => req.assigned_at)
          .map(req => {
            const assigned = new Date(req.assigned_at).getTime();
            const completed = req.completedAt.getTime();
            return (completed - assigned) / (1000 * 60 * 60); // hours
          });
        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        return {
          id,
          name: contractorNames.get(id) || 'Unknown',
          totalAssigned,
          completedCount,
          completionRate,
          avgResponseTime
        };
      })
      .filter(c => c.totalAssigned > 0)
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [requests, activityLogs, contractors]);

  const submissionMethodStats = useMemo((): SubmissionMethodStats => {
    const stats: SubmissionMethodStats = {
      form: 0,
      ai_assistant: 0,
      public_form: 0,
      public_ai_assistant: 0
    };

    requests.forEach(req => {
      const method = req.submission_method || 'form';
      if (method in stats) {
        stats[method as keyof SubmissionMethodStats]++;
      } else {
        // Default to form for legacy requests without submission_method
        stats.form++;
      }
    });

    return stats;
  }, [requests]);

  return {
    loading,
    error,
    monthlyTrends,
    topProperties,
    timeInsights,
    lifecycleMetrics,
    contractorStats,
    submissionMethodStats
  };
};
