
import { format } from 'date-fns';

// Format the timestamp string to a more readable format using DD/MM/YYYY
export const formatTimestamp = (timestamp: string): string => {
  try {
    if (!timestamp) return 'N/A';
    
    let date: Date;
    
    // Check if timestamp is in DD/MM/YYYY format (e.g., "11/12/2025")
    const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const ddmmyyyyMatch = timestamp.match(ddmmyyyyRegex);
    
    if (ddmmyyyyMatch) {
      // Parse DD/MM/YYYY format manually to avoid JavaScript's MM/DD/YYYY interpretation
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // Months are 0-indexed
      const year = parseInt(ddmmyyyyMatch[3], 10);
      date = new Date(year, month, day);
    } else {
      // For ISO timestamps and other formats, use standard parsing
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    
    return format(date, "d MMM yyyy 'at' h:mm a");
  } catch (error) {
    return timestamp;
  }
};
