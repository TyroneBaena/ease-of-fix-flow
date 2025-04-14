
import { MaintenanceRequest } from '../../reports/data/mockMaintenanceData';

// Update the function to correctly use isAdmin as a boolean value
export function filterMaintenanceRequests(
  requests: MaintenanceRequest[],
  propertyFilter: string,
  statusFilter: string,
  searchTerm: string,
  isAdmin: boolean, // Changed from function to boolean
  assignedProperties?: string[]
): MaintenanceRequest[] {
  return requests.filter(request => {
    // Filter by property access
    if (!isAdmin && assignedProperties) { // Changed from isAdmin() to isAdmin
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
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        request.title.toLowerCase().includes(searchLower) || 
        request.description.toLowerCase().includes(searchLower) ||
        request.requestId.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
}
