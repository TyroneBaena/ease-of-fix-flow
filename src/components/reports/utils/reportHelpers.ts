
import { MaintenanceRequest } from '@/types/property';
import { format } from 'date-fns';

// Get style classes for priority badge
export const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get style classes for status badge
export const getStatusClass = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'in-progress':
      return 'bg-purple-100 text-purple-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Format date from ISO string
export const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM d, yyyy');
};

// Filter maintenance requests based on filters and user role
export const filterMaintenanceRequests = (
  maintenanceRequests: MaintenanceRequest[], 
  propertyFilter: string,
  statusFilter: string,
  searchTerm: string,
  isAdmin: boolean,
  userAssignedProperties?: string[]
) => {
  return maintenanceRequests.filter(request => {
    // Filter by property
    if (propertyFilter !== 'all' && request.propertyId !== propertyFilter) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !request.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by user's properties if not admin
    if (!isAdmin && !userAssignedProperties?.includes(request.propertyId)) {
      return false;
    }
    
    return true;
  });
};
