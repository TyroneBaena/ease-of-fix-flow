export type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type EventSourceType = 'manual' | 'job_schedule' | 'system';

export interface CalendarEvent {
  id: string;
  organizationId: string;
  propertyId?: string | null;
  propertyName?: string | null; // Joined from properties table
  
  // Event details
  title: string;
  description?: string | null;
  eventDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  
  // Recurrence (null = one-off event)
  recurrenceType?: RecurrenceType | null;
  recurrenceEndDate?: string | null;
  recurrenceDays?: number[] | null; // For weekly: [0-6], for monthly: day of month
  parentEventId?: string | null;
  
  // Source tracking
  sourceType: EventSourceType;
  sourceId?: string | null;
  
  // Related entities (for job_schedule events)
  contractorId?: string | null;
  contractorName?: string | null; // Joined from contractors table
  maintenanceRequestId?: string | null;
  maintenanceRequestTitle?: string | null; // Joined from maintenance_requests table
  
  // Metadata
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventFormData {
  title: string;
  description?: string;
  propertyId?: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: string;
  recurrenceDays?: number[];
}

export interface CalendarFilter {
  propertyId?: string | null;
  startDate: string;
  endDate: string;
  sourceTypes?: EventSourceType[];
}

// Helper type for day-of-week selection
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

export const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;
