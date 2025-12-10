import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { CalendarEventCard } from './CalendarEventCard';
import { format, parseISO } from 'date-fns';
import { formatCalendarDay } from '@/utils/dateFormatUtils';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CalendarDayEventsProps {
  date: Date | null;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
  maxHeight?: string;
}

export const CalendarDayEvents: React.FC<CalendarDayEventsProps> = ({
  date,
  events,
  onEventClick,
  onAddEvent,
  maxHeight = '300px',
}) => {
  if (!date) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a date to view events</p>
      </div>
    );
  }

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(e => e.eventDate === dateStr);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">
          {formatCalendarDay(date)}
        </h3>
        {onAddEvent && (
          <Button variant="ghost" size="sm" onClick={onAddEvent}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {dayEvents.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">No events scheduled</p>
          {onAddEvent && (
            <Button 
              variant="link" 
              size="sm" 
              className="mt-1"
              onClick={onAddEvent}
            >
              Add an event
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea style={{ maxHeight }} className="pr-2">
          <div className="space-y-2">
            {dayEvents.map(event => (
              <CalendarEventCard
                key={event.id}
                event={event}
                onClick={onEventClick}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
