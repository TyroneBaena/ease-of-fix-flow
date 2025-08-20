
import { useState, useEffect } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestOperations } from './useMaintenanceRequestOperations';
import { formatRequestData } from '@/hooks/request-detail/formatRequestData';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';

export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useUserContext();
  const { fetchRequests, addRequest } = useMaintenanceRequestOperations(currentUser);

  useEffect(() => {
    console.log('useMaintenanceRequestProvider - Current user:', currentUser);
    if (currentUser) {
      loadRequests();
      
      // Set up real-time subscription for maintenance requests
      const channel = supabase
        .channel('maintenance-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'maintenance_requests'
          },
          async (payload) => {
            console.log('🔄 REAL-TIME: Maintenance request change detected:', payload.eventType, payload);
            
            // Force immediate refresh on any change
            console.log('🔄 REAL-TIME: Triggering immediate context refresh');
            await loadRequests();
          }
        )
        .subscribe((status) => {
          console.log('🔌 REAL-TIME: Global maintenance subscription status:', status);
        });

      return () => {
        console.log('🔌 REAL-TIME: Unsubscribing from global maintenance requests channel');
        supabase.removeChannel(channel);
      };
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
        // Use formatRequestData to properly convert database objects to MaintenanceRequest type
        const formattedRequests = fetchedRequests.map(request => formatRequestData(request));
        console.log('Formatted maintenance requests:', formattedRequests);
        setRequests(formattedRequests);
        return formattedRequests;
      } else {
        console.log('No maintenance requests found for this user');
        setRequests([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getRequestsForProperty = (propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  };

  const addRequestToProperty = async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    console.log('Adding request to property with data:', requestData);
    // Ensure required fields are present with defaults
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
      // Format the new request before adding to state
      const formattedNewRequest = formatRequestData(newRequest);
      setRequests(prev => [...prev, formattedNewRequest]);
      toast.success('Maintenance request added successfully');
      return formattedNewRequest;
    } else {
      console.error('Failed to create new request');
    }
  };

  // Helper function to determine if user should see this request
  const shouldUserSeeRequest = (requestData: any, userId: string) => {
    // User owns the request
    if (requestData.user_id === userId) return true;
    
    // User is assigned to property (managers)
    // This would need to be enhanced based on your property access logic
    
    // For now, we'll refresh for all users since RLS will filter appropriately
    return true;
  };

  return {
    requests,
    loading,
    getRequestsForProperty,
    addRequestToProperty,
    loadRequests,
  };
};
