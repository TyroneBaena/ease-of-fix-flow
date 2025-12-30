import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Users, 
  BarChart3, 
  Clock,
  User,
  FileText,
  Sparkles,
  MousePointer
} from 'lucide-react';
import { useAppActivityAnalytics } from '@/hooks/useAppActivityAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  reports: 'Reports',
  requests: 'Requests',
  properties: 'Properties',
  settings: 'Settings',
  calendar: 'Calendar',
  new_request: 'New Request',
  admin_users: 'Admin - Users',
  admin_contractors: 'Admin - Contractors',
  scheduled_timeline: 'Scheduled Timeline',
  // Contractor portal pages
  contractor_dashboard: 'Contractor Dashboard',
  contractor_jobs: 'Contractor Jobs',
  contractor_job_detail: 'Job Details',
  contractor_quote_submission: 'Quote Submission',
  contractor_profile: 'Contractor Profile',
  contractor_schedule: 'Contractor Schedule',
  contractor_settings: 'Contractor Settings',
};

const FEATURE_LABELS: Record<string, string> = {
  new_request_form: 'Request Form',
  ai_assistant: 'AI Assistant',
  report_export: 'Report Export',
  bulk_download: 'Bulk Download'
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  page_view: <FileText className="h-3 w-3" />,
  feature_used: <Sparkles className="h-3 w-3" />,
  action: <MousePointer className="h-3 w-3" />
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.8)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.3)',
];

const ActivityTracker: React.FC = () => {
  const { 
    loading, 
    error, 
    totalActions, 
    activeUsersCount, 
    mostActiveUsers, 
    pageUsage, 
    featureUsage,
    recentActivity 
  } = useAppActivityAnalytics(7);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Failed to load activity data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsersCount}</p>
                <p className="text-sm text-muted-foreground">Active Users (7 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActions}</p>
                <p className="text-sm text-muted-foreground">Total Actions (7 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pageUsage.length}</p>
                <p className="text-sm text-muted-foreground">Pages Visited</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Page Usage Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Most Visited Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pageUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pageUsage.slice(0, 5)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="pageName" 
                    width={100}
                    tickFormatter={(value) => PAGE_LABELS[value] || value}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Views']}
                    labelFormatter={(label) => PAGE_LABELS[label] || label}
                  />
                  <Bar dataKey="viewCount" radius={[0, 4, 4, 0]}>
                    {pageUsage.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No page views recorded yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Active Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {mostActiveUsers.length > 0 ? (
                <div className="space-y-3">
                  {mostActiveUsers.slice(0, 5).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.userName}</p>
                          <p className="text-xs text-muted-foreground">{user.userEmail}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{user.actionCount} actions</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No user activity recorded yet
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage */}
      {featureUsage.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Feature Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {featureUsage.map((feature) => (
                <Badge key={feature.featureName} variant="outline" className="text-sm py-1.5 px-3">
                  {FEATURE_LABELS[feature.featureName] || feature.featureName}: {feature.usageCount}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      {EVENT_ICONS[activity.event_type] || <Activity className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{activity.user_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {activity.event_type === 'page_view' 
                            ? `Viewed ${PAGE_LABELS[activity.event_name] || activity.event_name}`
                            : activity.event_type === 'feature_used'
                            ? `Used ${FEATURE_LABELS[activity.event_name] || activity.event_name}`
                            : activity.event_name
                          }
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No recent activity recorded
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityTracker;
