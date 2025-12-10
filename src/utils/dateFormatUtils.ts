import { format } from 'date-fns';

/**
 * Centralized date formatting utility for Australian standard (day-month-year)
 * All dates display as "11 Dec 2025" format throughout the application
 */

// Parse DD/MM/YYYY string safely (handles report_date field format)
export const parseDDMMYYYY = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateString.match(ddmmyyyyRegex);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Months are 0-indexed
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
};

// Convert any date input to a Date object, handling DD/MM/YYYY strings
export const toDate = (input: string | Date | null | undefined): Date | null => {
  if (!input) return null;
  
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  
  // Try DD/MM/YYYY format first
  const parsed = parseDDMMYYYY(input);
  if (parsed) return parsed;
  
  // Fall back to standard parsing (ISO, etc.)
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
};

// Full date with time: "11 Dec 2025 3:45 PM"
export const formatFullDateTime = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, "d MMM yyyy h:mm a");
};

// Full date without time: "11 Dec 2025"
export const formatFullDate = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, 'd MMM yyyy');
};

// Short date: "11 Dec"
export const formatShortDate = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, 'd MMM');
};

// Calendar day header: "Wednesday, 11 December"
export const formatCalendarDay = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, 'EEEE, d MMMM');
};

// Relative day with weekday: "Wed, 11 Dec"
export const formatRelativeDay = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, 'EEE, d MMM');
};

// Time only: "3:45 PM"
export const formatTime = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, 'h:mm a');
};

// Date with seconds for logs: "11 Dec 15:45:30"
export const formatDateTimeWithSeconds = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, 'd MMM HH:mm:ss');
};

// Month and year only: "December 2025"
export const formatMonthYear = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return 'N/A';
  return format(date, 'MMMM yyyy');
};

// Day of month only: "11"
export const formatDayOfMonth = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return '';
  return format(date, 'd');
};

// Weekday short: "Wed"
export const formatWeekdayShort = (input: string | Date | null | undefined): string => {
  const date = toDate(input);
  if (!date) return '';
  return format(date, 'EEE');
};

// Format date range: "11 Dec - 18 Dec 2025"
export const formatDateRange = (
  from: string | Date | null | undefined,
  to: string | Date | null | undefined
): string => {
  const fromDate = toDate(from);
  const toDate_ = toDate(to);
  
  if (!fromDate && !toDate_) return 'N/A';
  if (!fromDate) return `Until ${formatFullDate(toDate_)}`;
  if (!toDate_) return `From ${formatFullDate(fromDate)}`;
  
  // Same year - don't repeat year on first date
  if (fromDate.getFullYear() === toDate_.getFullYear()) {
    return `${format(fromDate, 'd MMM')} - ${format(toDate_, 'd MMM yyyy')}`;
  }
  
  return `${formatFullDate(fromDate)} - ${formatFullDate(toDate_)}`;
};
