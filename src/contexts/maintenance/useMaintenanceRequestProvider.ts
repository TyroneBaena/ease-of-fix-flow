import { useState, useEffect } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestOperations } from './useMaintenanceRequestOperations';
import { toast } from '@/lib/toast';

export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useUserContext();
  const { fetchRequests, addRequest } = useMaintenanceRequestOperations(currentUser);

  useEffect(() => {
    console.log('useMaintenanceRequestProvider - Current user:', currentUser);
    if (currentUser) {
      loadRequests();
    } else {
      console.log('No current user, skipping request loading');
      setRequests([]);
      setLoading(false);
    }
  }, [currentUser]);

  const loadRequests = async () => {
    console.log('Loading maintenance requests for user:', currentUser?.id);
    setLoading(true);
    try {
      const fetchedRequests = await fetchRequests();
      console.log('Fetched maintenance requests:', fetchedRequests);
      
      if (fetchedRequests && fetchedRequests.length > 0) {
        // Ensure all required properties are present
        const validatedRequests = fetchedRequests.map(request => ({
          ...request,
          site: request.site || request.category || 'Unknown',
          title: request.title || request.issueNature || 'Untitled Request',
          location: request.location || 'Unknown',
          submittedBy: request.submittedBy || 'Anonymous'
        }));
        setRequests(validatedRequests as MaintenanceRequest[]);
        return validatedRequests as MaintenanceRequest[];
      } else {
        console.log('No maintenance requests found for this user');
        setRequests([]); // Set empty array instead of using sample data
        return [] as MaintenanceRequest[];
      }
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      return [] as MaintenanceRequest[];
    } finally {
      setLoading(false);
    }
  };

  const getRequestsForProperty = (propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  };

  const addRequestToProperty = async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    console.log('Adding request to property with data:', requestData);
    // Ensure site is present
    const requestWithDefaults = {
      ...requestData,
      site: requestData.site || requestData.category || 'Unknown',
      title: requestData.title || requestData.issueNature || 'Untitled Request',
      location: requestData.location || 'Unknown',
      submittedBy: requestData.submittedBy || 'Anonymous'
    };
    
    const newRequest = await addRequest(requestWithDefaults);
    
    if (newRequest) {
      console.log('New request created successfully:', newRequest);
      setRequests(prev => [...prev, newRequest as MaintenanceRequest]);
      toast.success('Maintenance request added successfully');
      return newRequest as MaintenanceRequest;
    } else {
      console.error('Failed to create new request');
    }
  };

  return {
    requests,
    loading,
    getRequestsForProperty,
    addRequestToProperty,
    loadRequests,
  };
};
