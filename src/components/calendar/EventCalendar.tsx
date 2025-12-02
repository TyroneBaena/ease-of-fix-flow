import React, { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';

interface EventCalendarProps {
  events: CalendarEvent[];
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onMonthChange?: (month: Date) => void;
  className?: string;
}

export const EventCalendar: React.FC<EventCalendarProps> = ({
  events,
  selectedDate,
  onDateSelect,
  onMonthChange,
  className,
}) => {
  // Create a map of dates that have events
  const eventDates = useMemo(() => {
    const dates = new Map<string, { count: number; hasJobSchedule: boolean }>();
    
    events.forEach(event => {
      const existing = dates.get(event.eventDate) || { count: 0, hasJobSchedule: false };
      dates.set(event.eventDate, {
        count: existing.count + 1,
        hasJobSchedule: existing.hasJobSchedule || event.sourceType === 'job_schedule',
      });
    });
    
    return dates;
  }, [events]);

  // Custom day content to show event indicators
  const modifiers = useMemo(() => {
    const hasEvents: Date[] = [];
    const hasJobSchedule: Date[] = [];
    
    eventDates.forEach((info, dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      hasEvents.push(date);
      if (info.hasJobSchedule) {
        hasJobSchedule.push(date);
      }
    });
    
    return { hasEvents, hasJobSchedule };
  }, [eventDates]);

  const modifiersStyles = {
    hasEvents: {
      position: 'relative' as const,
    },
    hasJobSchedule: {
      position: 'relative' as const,
    },
  };

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onDateSelect}
      onMonthChange={onMonthChange}
      modifiers={modifiers}
      modifiersStyles={modifiersStyles}
      className={cn("rounded-md border bg-card", className)}
      classNames={{
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative"
        ),
      }}
      components={{
        DayContent: ({ date }) => {
          const dateStr = date.toISOString().split('T')[0];
          const eventInfo = eventDates.get(dateStr);
          
          return (
            <div className="relative w-full h-full flex items-center justify-center">
              <span>{date.getDate()}</span>
              {eventInfo && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {eventInfo.hasJobSchedule ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground/50" />
                  )}
                  {eventInfo.count > 1 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  )}
                </div>
              )}
            </div>
          );
        },
      }}
    />
  );
};
