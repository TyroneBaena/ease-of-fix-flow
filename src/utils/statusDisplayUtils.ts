
/**
 * Centralized status display utilities for consistent status presentation
 * across all maintenance request lists and components.
 */

export type DisplayStatus = 'Open' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';

/**
 * Maps raw database status to user-friendly display label
 */
export const getDisplayStatus = (status: string, assignedToLandlord?: boolean): DisplayStatus => {
  // Check for assigned status first (contractor or landlord assignment)
  if (status === 'requested' || (assignedToLandlord === true && !['completed', 'cancelled'].includes(status))) {
    return 'Assigned';
  }
  
  switch (status) {
    case 'open':
    case 'pending':
      return 'Open';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Open';
  }
};

/**
 * Returns consistent color classes for display status
 */
export const getDisplayStatusColor = (displayStatus: DisplayStatus): string => {
  switch (displayStatus) {
    case 'Open':
      return 'bg-amber-100 text-amber-800';
    case 'Assigned':
      return 'bg-purple-100 text-purple-800';
    case 'In Progress':
      return 'bg-blue-100 text-blue-800';
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Combined helper - gets color from raw status directly
 */
export const getStatusColorFromRaw = (status: string, assignedToLandlord?: boolean): string => {
  const displayStatus = getDisplayStatus(status, assignedToLandlord);
  return getDisplayStatusColor(displayStatus);
};

/**
 * Filter options for status dropdowns - simplified to match dashboard cards
 */
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

/**
 * Checks if a request matches the selected status filter
 * Handles the grouped statuses (open = pending + open, assigned = requested + landlord assigned)
 */
export const matchesStatusFilter = (
  filterValue: string,
  requestStatus: string,
  assignedToLandlord?: boolean
): boolean => {
  if (filterValue === 'all') return true;
  
  switch (filterValue) {
    case 'open':
      // Match both 'open' and 'pending' statuses
      return requestStatus === 'open' || requestStatus === 'pending';
    case 'assigned':
      // Match contractor assigned OR landlord assigned (not completed/cancelled)
      const isContractorAssigned = requestStatus === 'requested';
      const isLandlordAssigned = assignedToLandlord === true && 
        !['completed', 'cancelled'].includes(requestStatus);
      return isContractorAssigned || isLandlordAssigned;
    case 'in-progress':
      return requestStatus === 'in-progress';
    case 'completed':
      return requestStatus === 'completed';
    case 'cancelled':
      return requestStatus === 'cancelled';
    default:
      return requestStatus === filterValue;
  }
};
