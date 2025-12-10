import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, AlertCircle, ChevronRight, Building2 } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { differenceInDays } from 'date-fns';

interface PendingActionsWidgetProps {
  requests: MaintenanceRequest[];
}

interface AgingRequest {
  request: MaintenanceRequest;
  daysOld: number;
  propertyName?: string;
}

export const PendingActionsWidget: React.FC<PendingActionsWidgetProps> = ({ requests }) => {
  const navigate = useNavigate();

  const { agingRequests, highPriorityUnassigned, breakdown } = useMemo(() => {
    const now = new Date();
    const pendingOrOpen = requests.filter(
      r => r.status === 'pending' || r.status === 'open'
    );

    // Calculate aging for each request
    const aging: AgingRequest[] = pendingOrOpen
      .map(request => ({
        request,
        daysOld: differenceInDays(now, new Date(request.createdAt)),
        propertyName: (request as any).property?.name
      }))
      .filter(item => item.daysOld >= 3)
      .sort((a, b) => b.daysOld - a.daysOld);

    // High priority unassigned requests
    const highPriority = pendingOrOpen.filter(
      r => (r.priority === 'high' || r.priority === 'critical') && 
           !r.contractorId && 
           !r.assigned_to_landlord
    );

    // Age breakdown
    const breakdown = {
      days3to7: aging.filter(a => a.daysOld >= 3 && a.daysOld < 7).length,
      days7to14: aging.filter(a => a.daysOld >= 7 && a.daysOld < 14).length,
      days14plus: aging.filter(a => a.daysOld >= 14).length
    };

    return {
      agingRequests: aging,
      highPriorityUnassigned: highPriority,
      breakdown
    };
  }, [requests]);

  // Don't render if there are no pending actions
  if (agingRequests.length === 0 && highPriorityUnassigned.length === 0) {
    return null;
  }

  const handleViewAll = () => {
    navigate('/requests?status=open');
  };

  const handleRequestClick = (requestId: string) => {
    navigate(`/requests/${requestId}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAgeBadgeColor = (days: number) => {
    if (days >= 14) return 'bg-red-100 text-red-700';
    if (days >= 7) return 'bg-orange-100 text-orange-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg font-semibold text-amber-900">
              Pending Actions
            </CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewAll}
            className="text-amber-700 border-amber-300 hover:bg-amber-100"
          >
            View All Pending
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Aging (&gt;3 days)</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{agingRequests.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">High Priority</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{highPriorityUnassigned.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 col-span-2">
            <span className="text-sm text-muted-foreground">Age Breakdown</span>
            <div className="flex gap-3 mt-1">
              <span className="text-sm">
                <span className="font-semibold text-amber-600">{breakdown.days3to7}</span> 3-7d
              </span>
              <span className="text-sm">
                <span className="font-semibold text-orange-600">{breakdown.days7to14}</span> 7-14d
              </span>
              <span className="text-sm">
                <span className="font-semibold text-red-600">{breakdown.days14plus}</span> 14d+
              </span>
            </div>
          </div>
        </div>

        {/* Most Urgent Requests */}
        {agingRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Most Urgent</h4>
            {agingRequests.slice(0, 5).map(({ request, daysOld, propertyName }) => (
              <div 
                key={request.id}
                onClick={() => handleRequestClick(request.id)}
                className="bg-white rounded-lg p-3 border border-amber-200 hover:border-amber-400 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {request.title}
                    </p>
                    {propertyName && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{propertyName}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={getAgeBadgeColor(daysOld)} variant="outline">
                      {daysOld}d
                    </Badge>
                    <Badge className={getPriorityColor(request.priority)} variant="outline">
                      {request.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            {agingRequests.length > 5 && (
              <p className="text-xs text-amber-600 text-center pt-1">
                +{agingRequests.length - 5} more pending requests
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
