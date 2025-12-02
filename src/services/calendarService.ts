import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent, CalendarEventFormData, CalendarFilter, EventSourceType } from '@/types/calendar';

// Transform database row to CalendarEvent interface
const transformEvent = (row: any): CalendarEvent => ({
  id: row.id,
  organizationId: row.organization_id,
  propertyId: row.property_id,
  propertyName: row.properties?.name || row.property_name || null,
  title: row.title,
  description: row.description,
  eventDate: row.event_date,
  startTime: row.start_time,
  endTime: row.end_time,
  recurrenceType: row.recurrence_type,
  recurrenceEndDate: row.recurrence_end_date,
  recurrenceDays: row.recurrence_days,
  parentEventId: row.parent_event_id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  contractorId: row.contractor_id,
  contractorName: row.contractors?.contact_name || row.contractor_name || null,
  maintenanceRequestId: row.maintenance_request_id,
  maintenanceRequestTitle: row.maintenance_requests?.title || row.request_title || null,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const calendarService = {
  /**
   * Get all calendar events for the organization within a date range
   * Optionally filter by property
   */
  async getOrganizationEvents(filter: CalendarFilter): Promise<CalendarEvent[]> {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        properties:property_id(name),
        contractors:contractor_id(contact_name),
        maintenance_requests:maintenance_request_id(title)
      `)
      .gte('event_date', filter.startDate)
      .lte('event_date', filter.endDate)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filter.propertyId) {
      query = query.eq('property_id', filter.propertyId);
    }

    if (filter.sourceTypes && filter.sourceTypes.length > 0) {
      query = query.in('source_type', filter.sourceTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching organization events:', error);
      throw error;
    }

    return (data || []).map(transformEvent);
  },

  /**
   * Get calendar events for a specific property
   */
  async getPropertyEvents(propertyId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        properties:property_id(name),
        contractors:contractor_id(contact_name),
        maintenance_requests:maintenance_request_id(title)
      `)
      .eq('property_id', propertyId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching property events:', error);
      throw error;
    }

    return (data || []).map(transformEvent);
  },

  /**
   * Get calendar events for a specific contractor
   */
  async getContractorEvents(contractorId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        properties:property_id(name),
        contractors:contractor_id(contact_name),
        maintenance_requests:maintenance_request_id(title)
      `)
      .eq('contractor_id', contractorId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching contractor events:', error);
      throw error;
    }

    return (data || []).map(transformEvent);
  },

  /**
   * Create a new calendar event
   */
  async createEvent(eventData: CalendarEventFormData, organizationId: string, createdBy?: string): Promise<CalendarEvent> {
    const insertData: any = {
      organization_id: organizationId,
      property_id: eventData.propertyId || null,
      title: eventData.title,
      description: eventData.description || null,
      event_date: eventData.eventDate,
      start_time: eventData.startTime,
      end_time: eventData.endTime,
      source_type: 'manual' as EventSourceType,
      created_by: createdBy || null,
    };

    // Add recurrence data if recurring
    if (eventData.isRecurring && eventData.recurrenceType) {
      insertData.recurrence_type = eventData.recurrenceType;
      insertData.recurrence_end_date = eventData.recurrenceEndDate || null;
      insertData.recurrence_days = eventData.recurrenceDays || null;
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert(insertData)
      .select(`
        *,
        properties:property_id(name),
        contractors:contractor_id(contact_name),
        maintenance_requests:maintenance_request_id(title)
      `)
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }

    return transformEvent(data);
  },

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, eventData: Partial<CalendarEventFormData>): Promise<CalendarEvent> {
    const updateData: any = {};

    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.description !== undefined) updateData.description = eventData.description;
    if (eventData.propertyId !== undefined) updateData.property_id = eventData.propertyId;
    if (eventData.eventDate !== undefined) updateData.event_date = eventData.eventDate;
    if (eventData.startTime !== undefined) updateData.start_time = eventData.startTime;
    if (eventData.endTime !== undefined) updateData.end_time = eventData.endTime;

    // Handle recurrence updates
    if (eventData.isRecurring !== undefined) {
      if (eventData.isRecurring && eventData.recurrenceType) {
        updateData.recurrence_type = eventData.recurrenceType;
        updateData.recurrence_end_date = eventData.recurrenceEndDate || null;
        updateData.recurrence_days = eventData.recurrenceDays || null;
      } else {
        updateData.recurrence_type = null;
        updateData.recurrence_end_date = null;
        updateData.recurrence_days = null;
      }
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .select(`
        *,
        properties:property_id(name),
        contractors:contractor_id(contact_name),
        maintenance_requests:maintenance_request_id(title)
      `)
      .single();

    if (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }

    return transformEvent(data);
  },

  /**
   * Delete a calendar event
   * @param deleteAllRecurring - If true and event has parent_event_id, delete all instances
   */
  async deleteEvent(eventId: string, deleteAllRecurring: boolean = false): Promise<void> {
    if (deleteAllRecurring) {
      // First check if this event has a parent or is a parent
      const { data: event } = await supabase
        .from('calendar_events')
        .select('parent_event_id, recurrence_type')
        .eq('id', eventId)
        .single();

      if (event) {
        const parentId = event.parent_event_id || (event.recurrence_type ? eventId : null);
        
        if (parentId) {
          // Delete parent and all children
          const { error: deleteChildrenError } = await supabase
            .from('calendar_events')
            .delete()
            .eq('parent_event_id', parentId);

          if (deleteChildrenError) {
            console.error('Error deleting recurring event children:', deleteChildrenError);
          }

          const { error: deleteParentError } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', parentId);

          if (deleteParentError) {
            console.error('Error deleting recurring event parent:', deleteParentError);
            throw deleteParentError;
          }

          return;
        }
      }
    }

    // Delete single event
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  },

  /**
   * Get events for a specific date
   */
  async getEventsForDate(date: string, propertyId?: string): Promise<CalendarEvent[]> {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        properties:property_id(name),
        contractors:contractor_id(contact_name),
        maintenance_requests:maintenance_request_id(title)
      `)
      .eq('event_date', date)
      .order('start_time', { ascending: true });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events for date:', error);
      throw error;
    }

    return (data || []).map(transformEvent);
  },

  /**
   * Get upcoming events (next N days)
   */
  async getUpcomingEvents(days: number = 7, propertyId?: string, limit: number = 10): Promise<CalendarEvent[]> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        properties:property_id(name),
        contractors:contractor_id(contact_name),
        maintenance_requests:maintenance_request_id(title)
      `)
      .gte('event_date', startDateStr)
      .lte('event_date', endDateStr)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }

    return (data || []).map(transformEvent);
  },
};
