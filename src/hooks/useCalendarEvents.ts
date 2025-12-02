import { useState, useCallback, useEffect } from 'react';
import { calendarService } from '@/services/calendarService';
import { CalendarEvent, CalendarEventFormData, CalendarFilter } from '@/types/calendar';
import { useToast } from '@/hooks/use-toast';

interface UseCalendarEventsOptions {
  initialFilter?: Partial<CalendarFilter>;
  propertyId?: string;
  contractorId?: string;
  autoFetch?: boolean;
  assignedProperties?: string[] | null; // For manager filtering
}

export const useCalendarEvents = (options: UseCalendarEventsOptions = {}) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to current month
  const getDefaultDateRange = useCallback(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    };
  }, []);

  const [filter, setFilter] = useState<CalendarFilter>(() => ({
    ...getDefaultDateRange(),
    ...options.initialFilter,
  }));

  /**
   * Fetch events based on current filter and options
   */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data: CalendarEvent[];

      if (options.contractorId) {
        data = await calendarService.getContractorEvents(
          options.contractorId,
          filter.startDate,
          filter.endDate
        );
      } else if (options.propertyId) {
        data = await calendarService.getPropertyEvents(
          options.propertyId,
          filter.startDate,
          filter.endDate
        );
      } else {
        data = await calendarService.getOrganizationEvents(filter, options.assignedProperties);
      }

      setEvents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(message);
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, options.propertyId, options.contractorId, options.assignedProperties]);

  /**
   * Create a new event
   */
  const createEvent = useCallback(async (
    eventData: CalendarEventFormData,
    organizationId: string,
    createdBy?: string
  ): Promise<CalendarEvent | null> => {
    try {
      const newEvent = await calendarService.createEvent(eventData, organizationId, createdBy);
      setEvents(prev => [...prev, newEvent].sort((a, b) => 
        a.eventDate.localeCompare(b.eventDate) || a.startTime.localeCompare(b.startTime)
      ));
      toast({
        title: 'Event created',
        description: `"${eventData.title}" has been added to the calendar.`,
      });
      return newEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  /**
   * Update an existing event
   */
  const updateEvent = useCallback(async (
    eventId: string,
    eventData: Partial<CalendarEventFormData>
  ): Promise<CalendarEvent | null> => {
    try {
      const updatedEvent = await calendarService.updateEvent(eventId, eventData);
      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
      toast({
        title: 'Event updated',
        description: 'The event has been updated successfully.',
      });
      return updatedEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  /**
   * Delete an event
   */
  const deleteEvent = useCallback(async (
    eventId: string,
    deleteAllRecurring: boolean = false
  ): Promise<boolean> => {
    try {
      await calendarService.deleteEvent(eventId, deleteAllRecurring);
      setEvents(prev => prev.filter(e => {
        if (e.id === eventId) return false;
        if (deleteAllRecurring && e.parentEventId === eventId) return false;
        return true;
      }));
      toast({
        title: 'Event deleted',
        description: deleteAllRecurring 
          ? 'The recurring event series has been deleted.' 
          : 'The event has been deleted.',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  /**
   * Update the date range filter
   */
  const setDateRange = useCallback((startDate: string, endDate: string) => {
    setFilter(prev => ({ ...prev, startDate, endDate }));
  }, []);

  /**
   * Update the property filter
   */
  const setPropertyFilter = useCallback((propertyId: string | null) => {
    setFilter(prev => ({ ...prev, propertyId }));
  }, []);

  /**
   * Get events for a specific date from current loaded events
   */
  const getEventsForDate = useCallback((date: string): CalendarEvent[] => {
    return events.filter(e => e.eventDate === date);
  }, [events]);

  /**
   * Get dates that have events (for calendar highlighting)
   */
  const getDatesWithEvents = useCallback((): Set<string> => {
    return new Set(events.map(e => e.eventDate));
  }, [events]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchEvents();
    }
  }, [fetchEvents, options.autoFetch]);

  return {
    events,
    loading,
    error,
    filter,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    setDateRange,
    setPropertyFilter,
    getEventsForDate,
    getDatesWithEvents,
  };
};
