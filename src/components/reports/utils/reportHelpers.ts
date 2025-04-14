
import { MaintenanceRequest } from '@/types/property';
import { format } from 'date-fns';

// Format date for display
export const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch (e) {
    console.error('Invalid date:', dateString);
    return dateString;
  }
};

// Get CSS class based on status
export const getStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'open':
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'in-progress':
    case 'in_progress': 
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get CSS class based on priority
export const getPriorityClass = (priority: string | undefined) => {
  if (!priority) return 'bg-gray-100 text-gray-800';

  switch (priority.toLowerCase()) {
    case 'low':
      return 'bg-gray-100 text-gray-800';
    case 'medium':
      return 'bg-blue-100 text-blue-800';
    case 'high':
      return 'bg-amber-100 text-amber-800';
    case 'critical':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to filter maintenance requests
export const filterMaintenanceRequests = (
  requests: MaintenanceRequest[],
  propertyFilter: string,
  statusFilter: string,
  searchTerm: string,
  isAdmin: boolean,
  assignedProperties?: string[]
) => {
  return requests.filter(request => {
    // Filter by property
    if (propertyFilter !== 'all' && request.propertyId !== propertyFilter) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const displayTitle = request.issueNature || request.title || '';
      const displayDescription = request.explanation || request.description || '';
      
      const matchesSearch = 
        displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
        displayDescription.toLowerCase().includes(searchTerm.toLowerCase());
        
      if (!matchesSearch) {
        return false;
      }
    }
    
    // Filter by user permissions
    if (!isAdmin && assignedProperties) {
      return assignedProperties.includes(request.propertyId || '');
    }
    
    return true;
  });
};
