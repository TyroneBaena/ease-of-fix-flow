import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePublicLinkAnalytics } from '@/hooks/usePublicLinkAnalytics';
import { 
  Eye, 
  FileText, 
  Users, 
  Building2,
  Clock,
  QrCode,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PublicLinkActivityTracker: React.FC = () => {
  const { 
    loading, 
    error, 
    totalPageViews, 
    totalSubmissions, 
    uniqueVisitors,
    mostAccessedProperties,
    recentActivity 
  } = usePublicLinkAnalytics();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading public link analytics: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPageViews}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueVisitors}</div>
            <p className="text-xs text-muted-foreground">By IP address</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Accessed Properties */}
      {mostAccessedProperties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Most Accessed Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostAccessedProperties.map((property) => (
                <div 
                  key={property.propertyId} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{property.propertyName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {property.pageViews} views
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {property.submissions} submissions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Public Link Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No public link activity recorded yet. Activity will appear here when users access your QR codes or public links.
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start gap-3 p-3 border-b border-border/50 last:border-0"
                  >
                    <div className={`p-2 rounded-full ${
                      activity.access_type === 'request_submitted' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.access_type === 'request_submitted' 
                        ? <FileText className="h-3 w-3" />
                        : <Eye className="h-3 w-3" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {activity.access_type === 'request_submitted' 
                          ? 'Request Submitted' 
                          : 'Page Viewed'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.property_name || 'Unknown Property'}
                      </p>
                      {activity.metadata?.submitted_by && (
                        <p className="text-xs text-muted-foreground">
                          By: {activity.metadata.submitted_by}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicLinkActivityTracker;
