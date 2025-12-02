import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EventCalendar } from './EventCalendar';
import { CalendarDayEvents } from './CalendarDayEvents';
import { CalendarEventDialog } from './CalendarEventDialog';
import { CalendarFilters } from './CalendarFilters';
import { CalendarEventCard } from './CalendarEventCard';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEvent, CalendarEventFormData } from '@/types/calendar';
import { useUserContext, useMultiOrganizationContext } from '@/contexts/UnifiedAuthContext';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CalendarPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPropertyId?: string | null;
  title?: string;
  showFilters?: boolean;
  contractorId?: string;
}

export const CalendarPopup: React.FC<CalendarPopupProps> = ({
  open,
  onOpenChange,
  initialPropertyId,
  title = 'Calendar',
  showFilters = true,
  contractorId,
}) => {
  const { currentUser } = useUserContext();
  const { currentOrganization } = useMultiOrganizationContext();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(initialPropertyId || null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calculate date range for current month view (with buffer for surrounding weeks)
  const startDate = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');

  const {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    setPropertyFilter,
  } = useCalendarEvents({
    initialFilter: {
      startDate,
      endDate,
      propertyId: selectedPropertyId,
    },
    propertyId: initialPropertyId || undefined,
    contractorId,
    autoFetch: open,
  });

  // Filter events by selected property
  const filteredEvents = selectedPropertyId
    ? events.filter(e => e.propertyId === selectedPropertyId)
    : events;

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentMonth(date);
  }, []);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handlePropertyChange = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
    setPropertyFilter(propertyId);
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

    if (selectedEvent) {
      await updateEvent(selectedEvent.id, data);
    } else {
      await createEvent(data, currentOrganization.id, currentUser?.id);
    }
    setEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string, deleteAllRecurring?: boolean) => {
    await deleteEvent(eventId, deleteAllRecurring);
    setEventDialogOpen(false);
    setSelectedEvent(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 bg-background">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>{title}</DialogTitle>
              <Button onClick={handleAddEvent} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>
            
            {showFilters && (
              <div className="mt-4">
                <CalendarFilters
                  selectedPropertyId={selectedPropertyId}
                  onPropertyChange={handlePropertyChange}
                />
              </div>
            )}
          </DialogHeader>

          <div className="flex flex-col md:flex-row h-[600px]">
            {/* Calendar Section */}
            <div className="md:w-1/2 p-4 border-r">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <EventCalendar
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  onMonthChange={handleMonthChange}
                />
              )}
            </div>

            {/* Events List Section */}
            <div className="md:w-1/2 p-4">
              <CalendarDayEvents
                date={selectedDate || null}
                events={filteredEvents}
                onEventClick={handleEventClick}
                onAddEvent={handleAddEvent}
                maxHeight="500px"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        initialDate={selectedDate}
        initialPropertyId={selectedPropertyId}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        isLoading={loading}
      />
    </>
  );
};
