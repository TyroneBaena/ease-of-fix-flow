
import { format } from 'date-fns';

// Format the timestamp string to a more readable format using DD/MM/YYYY
export const formatTimestamp = (timestamp: string): string => {
  try {
    // Try to parse the date - if it's already a valid date string
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      // If invalid date, return original
      return timestamp;
    }
    
    // Format as "6 May 2025 at 3:45 PM" with DD/MM/YYYY in mind
    return format(date, "d MMM yyyy 'at' h:mm a");
  } catch (error) {
    // If any parsing error occurs, return the original string
    return timestamp;
  }
};
