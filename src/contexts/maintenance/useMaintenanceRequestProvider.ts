
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { useMaintenanceRequestOperations } from './useMaintenanceRequestOperations';
import { formatRequestData } from '@/hooks/request-detail/formatRequestData';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';

export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useUserContext();
  const { fetchRequests, addRequest } = useMaintenanceRequestOperations(currentUser);

  const loadRequests = useCallback(async () => {
    console.log('🔍 LOADING REQUESTS v2.0 - User:', currentUser?.email, 'Role:', currentUser?.role, 'Org:', currentUser?.organization_id);
    
    if (!currentUser?.id) {
      console.log('🔍 LOADING REQUESTS v2.0 - No user, skipping');
      setLoading(false);
      return [];
    }
    
    // CRITICAL FIX: Try to load requests even if organization_id is not yet set
    // The backend RLS will handle filtering, and organization_id should be available from profile
    setLoading(true);
    try {
      // Add timeout protection (15 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request fetch timeout')), 15000);
      });
      
      const fetchPromise = fetchRequests();
      
      const fetchedRequests = await Promise.race([fetchPromise, timeoutPromise]);
      console.log('🔍 LOADING REQUESTS v2.0 - Fetched:', fetchedRequests?.length, 'requests');
      
      if (fetchedRequests && fetchedRequests.length > 0) {
        // Use formatRequestData to properly convert database objects to MaintenanceRequest type
        const formattedRequests = fetchedRequests.map(request => formatRequestData(request));
        console.log('🔍 LOADING REQUESTS - Formatted:', formattedRequests.length, 'requests');
        
        // Log specific requests for debugging
        const add24Request = formattedRequests.find(req => req.title?.includes('add24'));
        if (add24Request) {
          console.log('🔍 LOADING REQUESTS - Found add24 request:', add24Request);
        }
        
        setRequests(formattedRequests);
        return formattedRequests;
      } else {
        console.log('🔍 LOADING REQUESTS - No requests found');
        setRequests([]);
        return [];
      }
    } catch (error) {
      console.error('🔍 LOADING REQUESTS - Error:', error);
      if (error instanceof Error && error.message === 'Request fetch timeout') {
        console.warn('⏱️ Request fetch timed out, setting empty state');
      }
      setRequests([]);
      return [];
    } finally {
      // CRITICAL: Always set loading false
      setLoading(false);
    }
  }, [currentUser?.email, currentUser?.role, currentUser?.organization_id, fetchRequests]);

  useEffect(() => {
    console.log('🔍 MAINTENANCE PROVIDER v2.0 - Current user changed:', currentUser?.email);
    console.log('🔍 MAINTENANCE PROVIDER v2.0 - User ID:', currentUser?.id);
    console.log('🔍 MAINTENANCE PROVIDER v2.0 - User role:', currentUser?.role);
    console.log('🔍 MAINTENANCE PROVIDER v2.0 - User organization_id:', currentUser?.organization_id);
    
    // CRITICAL FIX: Load requests if user is authenticated, even without organization_id yet
    // The organization_id will be available from the profile or will be set shortly
    if (currentUser?.id) {
      console.log('🔍 MAINTENANCE PROVIDER v2.0 - User authenticated, loading requests');
      
      // FIXED: Only load once to prevent race conditions
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
      console.log('🔍 MAINTENANCE PROVIDER v2.0 - No current user, clearing requests');
      setRequests([]);
      setLoading(false);
    }
  }, [currentUser?.id, loadRequests]); // Only watch user ID changes to prevent excessive re-renders


  const getRequestsForProperty = useCallback((propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  }, [requests]);

  const addRequestToProperty = useCallback(async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
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
      return formattedNewRequest; // Return the formatted request with its ID
    } else {
      console.error('Failed to create new request');
      return null;
    }
  }, [addRequest]);

  // Helper function to determine if user should see this request
  const shouldUserSeeRequest = (requestData: any, userId: string) => {
    // User owns the request
    if (requestData.user_id === userId) return true;
    
    // User is assigned to property (managers)
    // This would need to be enhanced based on your property access logic
    
    // For now, we'll refresh for all users since RLS will filter appropriately
    return true;
  };

  return useMemo(() => ({
    requests,
    loading,
    getRequestsForProperty,
    addRequestToProperty,
    loadRequests,
  }), [
    requests,
    loading,
    getRequestsForProperty,
    addRequestToProperty,
    loadRequests
  ]);
};
