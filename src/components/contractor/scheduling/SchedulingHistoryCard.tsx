
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, User, FileText } from 'lucide-react';
import { formatFullDate, formatFullDateTime } from '@/utils/dateFormatUtils';

interface SchedulingHistoryItem {
  id: string;
  action: string;
  scheduled_dates: any[];
  notes?: string;
  created_at: string;
}

interface SchedulingHistoryCardProps {
  history: SchedulingHistoryItem[];
  loading: boolean;
}

export const SchedulingHistoryCard: React.FC<SchedulingHistoryCardProps> = ({
  history,
  loading
}) => {
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'scheduled':
        return 'default';
      case 'rescheduled':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatScheduledDates = (dates: any[]) => {
    if (!dates || dates.length === 0) return 'No dates';
    
    return dates.map((date, index) => (
      <div key={index} className="text-xs text-gray-600 mb-1">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{formatFullDate(date.date)}</span>
        </div>
        <div className="flex items-center gap-1 ml-4">
          <Clock className="h-3 w-3" />
          <span>{date.startTime} - {date.endTime}</span>
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Scheduling History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Scheduling History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No scheduling history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Scheduling History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {history.map((item) => (
            <div key={item.id} className="border-l-2 border-gray-200 pl-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={getActionBadgeVariant(item.action)}>
                  {item.action}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatFullDateTime(item.created_at)}
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Scheduled Dates:</p>
                  {formatScheduledDates(item.scheduled_dates)}
                </div>
                
                {item.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                    <p className="text-sm text-gray-600">{item.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
