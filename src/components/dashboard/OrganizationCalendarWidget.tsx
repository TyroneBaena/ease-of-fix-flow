import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, ChevronRight, Loader2, Maximize2 } from 'lucide-react';
import { CalendarEventCard } from '@/components/calendar/CalendarEventCard';
import { CalendarPopup } from '@/components/calendar/CalendarPopup';
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog';
import { calendarService } from '@/services/calendarService';
import { CalendarEvent, CalendarEventFormData } from '@/types/calendar';
import { useUserContext, useMultiOrganizationContext } from '@/contexts/UnifiedAuthContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export const OrganizationCalendarWidget: React.FC = () => {
  const { currentUser } = useUserContext();
  const { currentOrganization } = useMultiOrganizationContext();
  const { toast } = useToast();
  
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarPopupOpen, setCalendarPopupOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch upcoming events
  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        setLoading(true);
        const events = await calendarService.getUpcomingEvents(14, undefined, 5);
        setUpcomingEvents(events);
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, []);

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
        toast({ title: 'Event updated' });
      } else {
        await calendarService.createEvent(data, currentOrganization.id, currentUser?.id);
        toast({ title: 'Event created' });
      }
      
      // Refresh upcoming events
      const events = await calendarService.getUpcomingEvents(14, undefined, 5);
      setUpcomingEvents(events);
      setEventDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save event',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEvent = async (eventId: string, deleteAllRecurring?: boolean) => {
    try {
      await calendarService.deleteEvent(eventId, deleteAllRecurring);
      toast({ title: 'Event deleted' });
      
      // Refresh upcoming events
      const events = await calendarService.getUpcomingEvents(14, undefined, 5);
      setUpcomingEvents(events);
      setEventDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Upcoming Events
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddEvent}
                className="h-8 w-8 p-0"
                title="Add Event"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarPopupOpen(true)}
                className="h-8 w-8 p-0"
                title="View Full Calendar"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-6">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-3">
                No upcoming events
              </p>
              <Button variant="outline" size="sm" onClick={handleAddEvent}>
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[200px] pr-2">
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    onClick={handleEventClick}
                    showDate
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {upcomingEvents.length > 0 && (
            <Button
              variant="ghost"
              className="w-full mt-3 text-sm"
              onClick={() => setCalendarPopupOpen(true)}
            >
              View Full Calendar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Full Calendar Popup */}
      <CalendarPopup
        open={calendarPopupOpen}
        onOpenChange={setCalendarPopupOpen}
        title="Organization Calendar"
        showFilters={true}
      />

      {/* Event Dialog */}
      <CalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </>
  );
};
