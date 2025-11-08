
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
  
  // CRITICAL v65.0: Get operations hook that will receive CURRENT user
  const operations = useMaintenanceRequestOperations(currentUser);
  const { fetchRequests, addRequest } = operations;
  
  // Track the last user ID to prevent unnecessary refetches
  const lastFetchedUserIdRef = useRef<string | null>(null);
  // CRITICAL: Track if we've completed initial load to prevent loading flashes
  const hasCompletedInitialLoadRef = useRef(false);
  // CRITICAL: Prevent concurrent fetches during rapid tab switches
  const isFetchingRef = useRef(false);
  const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // CRITICAL: Track last fetch time to enable smart refresh on tab visibility
  const lastFetchTimeRef = useRef<number>(0);
  
  // CRITICAL v55.0: Use refs to access CURRENT auth state (not stale closure)
  const authStateRef = useRef({ isSessionReady, currentUser });
  
  // Update ref whenever auth state changes
  useEffect(() => {
    authStateRef.current = { isSessionReady, currentUser };
  }, [isSessionReady, currentUser]);

  // v77.3: CRITICAL DEBUG - Track component lifecycle
  useEffect(() => {
    console.log('🔵 v77.3 - MaintenanceRequest - COMPONENT MOUNTED/REMOUNTED');
    console.log('🔵 v77.3 - hasCompletedInitialLoadRef.current:', hasCompletedInitialLoadRef.current);
    console.log('🔵 v77.3 - loading state:', loading);
    
    return () => {
      console.log('🔴 v77.3 - MaintenanceRequest - COMPONENT UNMOUNTING');
    };
  }, []);

  // v77.0: CRITICAL FIX - Subscribe to coordinator's instant reset
  useEffect(() => {
    const unsubscribe = visibilityCoordinator.onTabRefreshChange((isRefreshing) => {
      console.log('🔄 v77.3 - MaintenanceRequest - Tab refresh change:', isRefreshing);
      console.log('🔄 v77.3 - hasCompletedInitialLoadRef.current:', hasCompletedInitialLoadRef.current);
      if (!isRefreshing && hasCompletedInitialLoadRef.current) {
        // Instant reset: Clear loading immediately on tab return
        console.log('⚡ v77.3 - MaintenanceRequest - Instant loading reset from coordinator');
        setLoading(false);
      } else if (!isRefreshing && !hasCompletedInitialLoadRef.current) {
        console.log('⚠️ v77.3 - MaintenanceRequest - Tab return but initial load NOT complete yet');
      }
    });
    
    return unsubscribe;
  }, []);

  // CRITICAL v65.0: Stable callback that accesses current values via ref
  const loadRequests = useCallback(async () => {
    const { isSessionReady: sessionReady, currentUser: user } = authStateRef.current;
    const userId = user?.id;
    
    console.log('🔍 v73.0 - LOADING REQUESTS', { 
      sessionReady, 
      hasUser: !!userId,
      email: user?.email,
      role: user?.role 
    });
    
    // CRITICAL: Wait for BOTH session ready AND user available
    if (!sessionReady) {
      console.log('🔍 v73.0 - LOADING REQUESTS - Waiting for session ready...');
      return [];
    }
    
    if (!userId) {
      console.log('🔍 v73.0 - LOADING REQUESTS - No user, skipping');
      setLoading(false);
      hasCompletedInitialLoadRef.current = true;
      return [];
    }
    
    // v77.1: Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('🔍 v77.1 - LOADING REQUESTS - Fetch already in progress, skipping');
      return [];
    }
    
    // v77.3: Enhanced logging for debugging
    console.log('🔍 v77.3 - loadRequests - hasCompletedInitialLoadRef:', hasCompletedInitialLoadRef.current);
    console.log('🔍 v77.3 - loadRequests - current loading state:', loading);
    
    // v77.1: CRITICAL - NEVER set loading after initial load
    // Background refreshes must be completely silent
    if (!hasCompletedInitialLoadRef.current) {
      console.log('✅ v77.3 - loadRequests - Setting loading=true (FIRST LOAD)');
      setLoading(true);
    } else {
      console.log('🔕 v77.3 - SILENT REFRESH - Skipping loading state (hasCompletedInitialLoad=true)');
    }
  
  isFetchingRef.current = true;
  
  // v73.0: 15s timeout to match health monitor detection (was 30s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn('⏱️ v73.0 - Request fetch timeout after 15s');
  }, 15000);

    try {
      console.log('🔍 v73.0 - LOADING REQUESTS - Calling fetchRequests with current user:', user?.email);
      const fetchedRequests = await fetchRequests(controller.signal);
      clearTimeout(timeoutId);
      
      console.log('🔍 v73.0 - LOADING REQUESTS - Fetched:', fetchedRequests?.length, 'requests');
      
      if (fetchedRequests && fetchedRequests.length > 0) {
        const formattedRequests = fetchedRequests.map(request => formatRequestData(request));
        console.log('🔍 v73.0 - LOADING REQUESTS - Formatted:', formattedRequests.length, 'requests');
        
        setRequests(formattedRequests);
        lastFetchTimeRef.current = Date.now();
        return formattedRequests;
      } else {
        console.log('🔍 v73.0 - LOADING REQUESTS - No requests found');
        setRequests([]);
        lastFetchTimeRef.current = Date.now();
        return [];
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('🔍 v73.0 - LOADING REQUESTS - Error:', error);
      
      if (controller.signal.aborted) {
        console.warn('⏱️ Request fetch aborted due to timeout');
      }
      
      setRequests([]);
      return [];
    } finally {
      // v73.0: CRITICAL FIX - Always reset loading and flags even if error/timeout
      // This prevents stuck loading states that health monitor can't detect
      console.log('🏁 v77.3 - loadRequests finally - BEFORE: hasCompletedInitialLoad=', hasCompletedInitialLoadRef.current);
      setLoading(false);
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      console.log('🏁 v77.3 - loadRequests finally - AFTER: loading=false, completed=true');
    }
  }, [fetchRequests]); // CRITICAL v65.0: Include fetchRequests so we get updates when user changes

  useEffect(() => {
    console.log('🚨 v62.0 - MAINTENANCE PROVIDER useEffect TRIGGERED');
    console.log('🚨 v62.0 - isSessionReady:', isSessionReady);
    console.log('🚨 v62.0 - currentUser:', currentUser);
    console.log('🚨 v62.0 - currentUser?.id:', currentUser?.id);
    console.log('🚨 v62.0 - currentUser?.role:', currentUser?.role);
    console.log('🚨 v62.0 - currentUser?.organization_id:', currentUser?.organization_id);
    console.log('🚨 v62.0 - hasCompletedInitialLoadRef:', hasCompletedInitialLoadRef.current);
    console.log('🚨 v62.0 - isFetchingRef:', isFetchingRef.current);
    
    // Clear any pending debounce timers
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    // CRITICAL: Wait for session to be ready
    if (!isSessionReady) {
      console.log('🚨 v62.0 - Waiting for session ready...');
      return;
    }
    
    // If no user, clear data
    if (!currentUser?.id) {
      console.log('🚨 v62.0 - No current user, clearing requests');
      setRequests([]);
      setLoading(false);
      lastFetchedUserIdRef.current = null;
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      return;
    }
    
    // CRITICAL v62.0: Force load EVERY time this effect runs with valid user
    console.log('🚨 v62.0 - ✅ Valid session + user, FORCING LOAD NOW!');
    console.log('🚨 v62.0 - About to call loadRequests()...');
    
    // Force immediate execution without debounce
    loadRequests().then(() => {
      console.log('🚨 v62.0 - loadRequests() completed!');
    }).catch(error => {
      console.error('🚨 v62.0 - loadRequests() ERROR:', error);
    });
    
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

  // CRITICAL v55.0: REMOVED - Let React Query handle refetching automatically
  // The onRefresh handlers were causing timeout errors and loading state issues
  // React Query's refetchOnWindowFocus handles this correctly
  // useEffect(() => {
  //   console.log('🔄 v55.0 - MaintenanceRequestProvider - Handler registration DISABLED');
  //   return () => {};
  // }, [loadRequests]);


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
    // v73.0: CRITICAL FIX - Always return false loading after initial load completes
    // This prevents UI getting stuck in loading state even if internal flag is somehow true
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
