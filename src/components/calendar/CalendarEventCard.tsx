import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Wrench, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatFullDate } from '@/utils/dateFormatUtils';
import { cn } from '@/lib/utils';

interface CalendarEventCardProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  compact?: boolean;
  showDate?: boolean;
}

export const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  event,
  onClick,
  compact = false,
  showDate = false,
}) => {
  const isJobSchedule = event.sourceType === 'job_schedule';
  
  // Format time display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  const timeDisplay = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(event)}
        className={cn(
          "px-2 py-1 rounded text-xs truncate cursor-pointer transition-colors",
          isJobSchedule 
            ? "bg-primary/10 text-primary hover:bg-primary/20" 
            : "bg-accent text-accent-foreground hover:bg-accent/80"
        )}
        title={event.title}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(event)}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        isJobSchedule 
          ? "border-primary/30 bg-primary/5 hover:border-primary/50" 
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">
            {event.title}
          </h4>
          
          {event.description && !compact && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        
        {isJobSchedule && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            <Wrench className="h-3 w-3 mr-1" />
            Job
          </Badge>
        )}
        
        {event.recurrenceType && (
          <Badge variant="outline" className="shrink-0 text-xs">
            Recurring
          </Badge>
        )}
      </div>

      <div className="mt-2 space-y-1">
        {showDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatFullDate(event.eventDate)}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{timeDisplay}</span>
        </div>

        {event.propertyName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{event.propertyName}</span>
          </div>
        )}

        {event.contractorName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{event.contractorName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
