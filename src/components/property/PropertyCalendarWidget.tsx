import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, ChevronLeft, ChevronRight, Maximize2, Loader2 } from 'lucide-react';
import { CalendarEventCard } from '@/components/calendar/CalendarEventCard';
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog';
import { CalendarPopup } from '@/components/calendar/CalendarPopup';
import { calendarService } from '@/services/calendarService';
import { CalendarEvent, CalendarEventFormData } from '@/types/calendar';
import { useUserContext, useMultiOrganizationContext } from '@/contexts/UnifiedAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventTypeFilter } from '@/components/calendar/CalendarFilters';

interface PropertyCalendarWidgetProps {
  propertyId: string;
  propertyName?: string;
}

export const PropertyCalendarWidget: React.FC<PropertyCalendarWidgetProps> = ({
  propertyId,
  propertyName = 'Property'
}) => {
  const { currentUser } = useUserContext();
  const { currentOrganization } = useMultiOrganizationContext();
  const { toast } = useToast();
  
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [calendarPopupOpen, setCalendarPopupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');

  const fetchEvents = useCallback(async () => {
    if (!propertyId) return;
    
    setLoading(true);
    try {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const events = await calendarService.getPropertyEvents(
        propertyId,
        format(currentWeekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      setUpcomingEvents(events);
    } catch (error) {
      console.error('Error fetching property calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [propertyId, currentWeekStart]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'all') return upcomingEvents;
    if (eventTypeFilter === 'jobs') {
      return upcomingEvents.filter(e => e.sourceType === 'job_schedule');
    }
    return upcomingEvents.filter(e => e.sourceType === 'manual' || !e.sourceType);
  }, [upcomingEvents, eventTypeFilter]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async (data: CalendarEventFormData) => {
    if (!currentOrganization?.id) return;

    try {
      if (selectedEvent) {
        await calendarService.updateEvent(selectedEvent.id, data);
        toast({
          title: 'Event updated',
          description: 'The event has been updated successfully.',
        });
      } else {
        await calendarService.createEvent(
          { ...data, propertyId },
          currentOrganization.id,
          currentUser?.id
        );
        toast({
          title: 'Event created',
          description: 'The event has been added to the calendar.',
        });
      }
      setEventDialogOpen(false);
      setSelectedEvent(null);
      await fetchEvents();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save event. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (eventId: string, deleteAllRecurring?: boolean) => {
    try {
      await calendarService.deleteEvent(eventId, deleteAllRecurring);
      toast({
        title: 'Event deleted',
        description: 'The event has been removed from the calendar.',
      });
      setEventDialogOpen(false);
      setSelectedEvent(null);
      await fetchEvents();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(currentWeekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Site Calendar
            </CardTitle>
            <div className="flex items-center gap-1">
              <Select
                value={eventTypeFilter}
                onValueChange={(value) => setEventTypeFilter(value as EventTypeFilter)}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="jobs">Jobs</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setCalendarPopupOpen(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleAddEvent}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {eventTypeFilter === 'all' ? 'No events this week' : `No ${eventTypeFilter} this week`}
              </p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleAddEvent}
                className="mt-1"
              >
                Add an event
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-2">
                {filteredEvents.map(event => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    onClick={() => handleEventClick(event)}
                    compact
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <CalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        initialDate={new Date()}
        initialPropertyId={propertyId}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        isLoading={loading}
      />

      <CalendarPopup
        open={calendarPopupOpen}
        onOpenChange={setCalendarPopupOpen}
        initialPropertyId={propertyId}
        title={`${propertyName} Calendar`}
        showFilters={false}
      />
    </>
  );
};
