
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useMaintenanceRequestOperations } from './useMaintenanceRequestOperations';
import { formatRequestData } from '@/hooks/request-detail/formatRequestData';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser, isSessionReady } = useUnifiedAuth();
  const { fetchRequests, addRequest } = useMaintenanceRequestOperations(currentUser);
  
  // Track the last user ID to prevent unnecessary refetches
  const lastFetchedUserIdRef = useRef<string | null>(null);
  // CRITICAL: Track if we've completed initial load to prevent loading flashes
  const hasCompletedInitialLoadRef = useRef(false);
  // CRITICAL: Prevent concurrent fetches during rapid tab switches
  const isFetchingRef = useRef(false);
  const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // CRITICAL: Track last fetch time to enable smart refresh on tab visibility
  const lastFetchTimeRef = useRef<number>(0);

  const loadRequests = useCallback(async () => {
    console.log('🔍 LOADING REQUESTS v5.0 - User:', currentUser?.email, 'Role:', currentUser?.role, 'Org:', currentUser?.organization_id, 'SessionReady:', isSessionReady);
    
    // CRITICAL: Wait for session to be ready before making queries
    if (!isSessionReady) {
      console.log('🔍 LOADING REQUESTS v5.0 - Waiting for session ready...');
      return [];
    }
    
    if (!currentUser?.id) {
      console.log('🔍 LOADING REQUESTS v5.0 - No user, skipping');
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
    
    // CRITICAL FIX: 60-second timeout - RLS queries calling get_current_user_organization_safe() are slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('⏱️ Request fetch timeout after 60s');
    }, 60000);

    try {
      const fetchedRequests = await fetchRequests(controller.signal);
      clearTimeout(timeoutId);
      
      console.log('🔍 LOADING REQUESTS v3.0 - Fetched:', fetchedRequests?.length, 'requests');
      
      if (fetchedRequests && fetchedRequests.length > 0) {
        const formattedRequests = fetchedRequests.map(request => formatRequestData(request));
        console.log('🔍 LOADING REQUESTS v3.0 - Formatted:', formattedRequests.length, 'requests');
        
        setRequests(formattedRequests);
        lastFetchTimeRef.current = Date.now();
        return formattedRequests;
      } else {
        console.log('🔍 LOADING REQUESTS v3.0 - No requests found');
        setRequests([]);
        lastFetchTimeRef.current = Date.now();
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
  }, [currentUser?.email, currentUser?.role, currentUser?.organization_id, isSessionReady, fetchRequests]);

  useEffect(() => {
    console.log('🔍 MAINTENANCE PROVIDER v6.0 - useEffect triggered');
    console.log('🔍 MAINTENANCE PROVIDER v6.0 - Current user ID:', currentUser?.id);
    console.log('🔍 MAINTENANCE PROVIDER v6.0 - Session ready:', isSessionReady);
    console.log('🔍 MAINTENANCE PROVIDER v6.0 - Last fetched ID:', lastFetchedUserIdRef.current);
    
    // Clear any pending debounce timers
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    // CRITICAL: Wait for session to be ready
    if (!isSessionReady) {
      console.log('🔍 MAINTENANCE PROVIDER v6.0 - Waiting for session ready...');
      return;
    }
    
    // If no user, clear data
    if (!currentUser?.id) {
      console.log('🔍 MAINTENANCE PROVIDER v6.0 - No current user, clearing requests');
      setRequests([]);
      setLoading(false);
      lastFetchedUserIdRef.current = null;
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      return;
    }
    
    // Only load if user ID actually changed
    if (lastFetchedUserIdRef.current === currentUser.id) {
      console.log('🔍 MAINTENANCE PROVIDER v6.0 - User ID unchanged, skipping refetch');
      return;
    }
    
    console.log('🔍 MAINTENANCE PROVIDER v6.0 - User ID changed, debouncing load');
    lastFetchedUserIdRef.current = currentUser.id;
    
    // CRITICAL: Debounce rapid tab switches (300ms delay)
    fetchDebounceTimerRef.current = setTimeout(() => {
      loadRequests();
    }, 300);
    
    // Set up real-time subscription for maintenance requests
    console.log('🔌 REAL-TIME: Setting up maintenance_requests subscription');
    const channel = supabase
      .channel('maintenance-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        (payload) => {
          console.log('🔄 REAL-TIME: Maintenance request change detected');
          console.log('🔄 REAL-TIME: Event type:', payload.eventType);
          console.log('🔄 REAL-TIME: Payload:', payload);
          
          // Handle different event types intelligently to avoid race conditions
          if (payload.eventType === 'INSERT' && payload.new) {
            console.log('🔄 REAL-TIME: INSERT event - New request ID:', payload.new.id);
            const formattedRequest = formatRequestData(payload.new);
            console.log('🔄 REAL-TIME: Formatted request:', formattedRequest);
            
            setRequests(prev => {
              console.log('🔄 REAL-TIME: Current requests count before INSERT:', prev.length);
              // Avoid duplicates
              const exists = prev.some(r => r.id === formattedRequest.id);
              if (exists) {
                console.log('🔄 REAL-TIME: Request already exists in state, skipping duplicate');
                return prev;
              }
              console.log('🔄 REAL-TIME: Adding new request to state');
              return [formattedRequest, ...prev]; // Add to beginning for visibility
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            console.log('🔄 REAL-TIME: UPDATE event - Request ID:', payload.new.id);
            const formattedRequest = formatRequestData(payload.new);
            setRequests(prev => prev.map(r => 
              r.id === formattedRequest.id ? formattedRequest : r
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            console.log('🔄 REAL-TIME: DELETE event - Request ID:', payload.old.id);
            setRequests(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ REAL-TIME: Successfully subscribed to maintenance_requests changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ REAL-TIME: Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('❌ REAL-TIME: Subscription timed out');
        } else {
          console.log('🔌 REAL-TIME: Subscription status:', status);
        }
      });

    return () => {
      console.log('🔌 REAL-TIME: Unsubscribing from global maintenance requests channel');
      supabase.removeChannel(channel);
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isSessionReady]);

  // Register with visibility coordinator for coordinated refresh
  useEffect(() => {
    if (!currentUser?.id || !isSessionReady) {
      console.log('🔄 MaintenanceRequestProvider - No user or session not ready, skipping registration');
      return;
    }

    const refreshMaintenance = async () => {
      console.log('🔄 MaintenanceRequestProvider - Coordinator-triggered refresh');
      // Only refresh if session is ready
      if (isSessionReady) {
        await loadRequests();
      } else {
        console.log('🔄 MaintenanceRequestProvider - Session not ready, skipping refresh');
      }
    };

    const unregister = visibilityCoordinator.onRefresh(refreshMaintenance);
    console.log('🔄 MaintenanceRequestProvider - Registered with visibility coordinator');

    return () => {
      unregister();
      console.log('🔄 MaintenanceRequestProvider - Cleanup: Unregistered from visibility coordinator');
    };
  }, [currentUser?.id, isSessionReady, loadRequests]);


  const getRequestsForProperty = useCallback((propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  }, [requests]);

  const addRequestToProperty = useCallback(async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    console.log('🆕 addRequestToProperty - Starting with data:', requestData);
    
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
      console.log('🆕 addRequestToProperty - Database insert successful:', newRequest);
      console.log('🆕 addRequestToProperty - New request ID:', newRequest.id);
      
      // Format the new request before adding to state
      const formattedNewRequest = formatRequestData(newRequest);
      console.log('🆕 addRequestToProperty - Formatted request:', formattedNewRequest);
      
      // CRITICAL FIX: Force immediate state update with new array reference
      setRequests(prev => {
        console.log('🆕 addRequestToProperty - Current requests count:', prev.length);
        // Check if already exists
        const existingIndex = prev.findIndex(r => r.id === formattedNewRequest.id);
        if (existingIndex !== -1) {
          console.log('🆕 addRequestToProperty - Request already exists, updating');
          const updated = [...prev];
          updated[existingIndex] = formattedNewRequest;
          return updated;
        }
        console.log('🆕 addRequestToProperty - Adding new request to state');
        // Add to beginning of array for immediate visibility
        return [formattedNewRequest, ...prev];
      });
      
      // USER REQUESTED: Force full page reload and redirect to dashboard after creating maintenance request
      // This ensures all components see the new data immediately
      console.log('🔄 addRequestToProperty - Request created successfully, redirecting to dashboard NOW');
      toast.success('Maintenance request added successfully. Redirecting...', { duration: 1500 });
      
      // Immediate redirect to dashboard with page refresh
      // No setTimeout - execute immediately to prevent any interference from component lifecycle
      console.log('🔄 addRequestToProperty - Current URL:', window.location.href);
      const dashboardUrl = `${window.location.origin}/dashboard`;
      console.log('🔄 addRequestToProperty - Redirecting to:', dashboardUrl);
      
      // Use replace to avoid back button issues
      window.location.replace(dashboardUrl);
      
      return formattedNewRequest;
    } else {
      console.error('🆕 addRequestToProperty - Failed to create new request');
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

  const contextValue = useMemo(() => ({
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
  
  return contextValue;
};
