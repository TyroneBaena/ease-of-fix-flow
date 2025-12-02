import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Loader2, MapPin, Clock } from 'lucide-react';
import { calendarService } from '@/services/calendarService';
import { CalendarEvent } from '@/types/calendar';
import { useContractorAuth } from '@/contexts/contractor/ContractorAuthContext';
import { format, addDays, startOfWeek, endOfWeek, isToday, isTomorrow, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ContractorCalendarWidgetProps {
  className?: string;
}

const formatEventTime = (startTime: string, endTime: string): string => {
  // Handle time strings in HH:MM:SS format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

const getDateLabel = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
};

export const ContractorCalendarWidget: React.FC<ContractorCalendarWidgetProps> = ({ className }) => {
  const { contractorId } = useContractorAuth();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchEvents = useCallback(async () => {
    if (!contractorId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const data = await calendarService.getContractorEvents(
        contractorId,
        format(currentWeekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      setEvents(data);
    } catch (error) {
      console.error('Error fetching contractor calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [contractorId, currentWeekStart]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    if (!acc[event.eventDate]) {
      acc[event.eventDate] = [];
    }
    acc[event.eventDate].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const sortedDates = Object.keys(eventsByDate).sort();

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            My Schedule
          </CardTitle>
        </div>
        
        {/* Week navigation */}
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
          <Button variant="ghost" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No scheduled jobs this week</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isToday(parseISO(date)) && "text-primary"
                    )}>
                      {getDateLabel(date)}
                    </span>
                    {isToday(parseISO(date)) && (
                      <Badge variant="secondary" className="text-xs">Today</Badge>
                    )}
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    {eventsByDate[date].map(event => (
                      <div 
                        key={event.id}
                        className="p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="font-medium text-sm line-clamp-1">
                          {event.title}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatEventTime(event.startTime, event.endTime)}</span>
                        </div>
                        
                        {event.propertyName && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{event.propertyName}</span>
                          </div>
                        )}
                        
                        {event.maintenanceRequestTitle && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {event.maintenanceRequestTitle}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
