
import { format } from 'date-fns';
import { MaintenanceRequest } from '@/types/property';

// Update the function to correctly use isAdmin as a boolean value
export function filterMaintenanceRequests(
  requests: MaintenanceRequest[],
  propertyFilter: string,
  statusFilter: string,
  searchTerm: string,
  isAdmin: boolean,
  assignedProperties?: string[],
  priorityFilter?: string,
  participantFilter?: string
): MaintenanceRequest[] {
  return requests.filter(request => {
    // Filter by property access
    if (!isAdmin && assignedProperties) {
      if (!assignedProperties.includes(request.propertyId)) {
        return false;
      }
    }
    
    // Filter by selected property
    if (propertyFilter !== 'all' && request.propertyId !== propertyFilter) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }
    
    // Filter by priority
    if (priorityFilter && priorityFilter !== 'all' && request.priority !== priorityFilter) {
      return false;
    }
    
    // Filter by participant related
    if (participantFilter && participantFilter !== 'all') {
      const isParticipantRelated = participantFilter === 'yes';
      if (request.isParticipantRelated !== isParticipantRelated) {
        return false;
      }
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        request.title?.toLowerCase().includes(searchLower) || 
        request.description?.toLowerCase().includes(searchLower) ||
        request.id?.toLowerCase().includes(searchLower) ||
        request.issueNature?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
}

// Add priority class utility function
export function getPriorityClass(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Add date formatting utility function using DD/MM/YYYY format
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}
