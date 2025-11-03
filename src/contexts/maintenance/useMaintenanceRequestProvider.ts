
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  
  // Track the last user ID to prevent unnecessary refetches
  const lastFetchedUserIdRef = useRef<string | null>(null);
  // CRITICAL: Track if we've completed initial load to prevent loading flashes
  const hasCompletedInitialLoadRef = useRef(false);
  // CRITICAL: Prevent concurrent fetches during rapid tab switches
  const isFetchingRef = useRef(false);
  const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadRequests = useCallback(async () => {
    console.log('🔍 LOADING REQUESTS v4.0 - User:', currentUser?.email, 'Role:', currentUser?.role, 'Org:', currentUser?.organization_id);
    
    if (!currentUser?.id) {
      console.log('🔍 LOADING REQUESTS v4.0 - No user, skipping');
      setLoading(false);
      hasCompletedInitialLoadRef.current = true;
      return [];
    }
    
    // CRITICAL: Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('🔍 LOADING REQUESTS v4.0 - Fetch already in progress, skipping');
      return [];
    }
    
    // CRITICAL: Only set loading on first fetch to prevent flash on tab switches
    if (!hasCompletedInitialLoadRef.current) {
      setLoading(true);
    }
    
    isFetchingRef.current = true;
    
    // CRITICAL FIX: 10-second timeout instead of 15 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('⏱️ Request fetch timeout after 10s');
    }, 10000);

    try {
      const fetchedRequests = await fetchRequests();
      clearTimeout(timeoutId);
      
      console.log('🔍 LOADING REQUESTS v3.0 - Fetched:', fetchedRequests?.length, 'requests');
      
      if (fetchedRequests && fetchedRequests.length > 0) {
        const formattedRequests = fetchedRequests.map(request => formatRequestData(request));
        console.log('🔍 LOADING REQUESTS v3.0 - Formatted:', formattedRequests.length, 'requests');
        
        setRequests(formattedRequests);
        return formattedRequests;
      } else {
        console.log('🔍 LOADING REQUESTS v3.0 - No requests found');
        setRequests([]);
        return [];
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('🔍 LOADING REQUESTS v3.0 - Error:', error);
      
      if (controller.signal.aborted) {
        console.warn('⏱️ Request fetch aborted due to timeout');
      }
      
      setRequests([]);
      return [];
    } finally {
      // CRITICAL: Only reset loading on first load, keep it false after
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(false);
      }
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
    }
  }, [currentUser?.email, currentUser?.role, currentUser?.organization_id, fetchRequests]);

  useEffect(() => {
    console.log('🔍 MAINTENANCE PROVIDER v5.0 - useEffect triggered');
    console.log('🔍 MAINTENANCE PROVIDER v5.0 - Current user ID:', currentUser?.id);
    console.log('🔍 MAINTENANCE PROVIDER v5.0 - Last fetched ID:', lastFetchedUserIdRef.current);
    
    // Clear any pending debounce timers
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    // If no user, clear data
    if (!currentUser?.id) {
      console.log('🔍 MAINTENANCE PROVIDER v5.0 - No current user, clearing requests');
      setRequests([]);
      setLoading(false);
      lastFetchedUserIdRef.current = null;
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      return;
    }
    
    // Only load if user ID actually changed
    if (lastFetchedUserIdRef.current === currentUser.id) {
      console.log('🔍 MAINTENANCE PROVIDER v5.0 - User ID unchanged, skipping refetch');
      return;
    }
    
    console.log('🔍 MAINTENANCE PROVIDER v5.0 - User ID changed, debouncing load');
    lastFetchedUserIdRef.current = currentUser.id;
    
    // CRITICAL: Debounce rapid tab switches (300ms delay)
    fetchDebounceTimerRef.current = setTimeout(() => {
      loadRequests();
    }, 300);
    
    // Set up real-time subscription for maintenance requests
    const channel = supabase
      .channel('maintenance-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        async (payload) => {
          console.log('🔄 REAL-TIME: Maintenance request change detected:', payload.eventType, payload);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Tab visibility detection - refresh stale data when tab becomes active


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
    // CRITICAL: Override loading to false after initial load completes
    // This prevents loading flashes on tab switches
    loading: hasCompletedInitialLoadRef.current ? false : loading,
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
