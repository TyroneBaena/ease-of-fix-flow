import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';
import { toast } from 'sonner';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 * - Controls refresh operations with strict lockout
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  
  // Data loading tracking refs
  const initialDataLoadedRef = useRef(false);
  const loadInProgressRef = useRef(false);
  
  // Strict refresh controls
  const refreshLockRef = useRef(true); // Start locked
  const refreshCountRef = useRef(0);
  const visibilityChangeRef = useRef(false);
  
  // Reset all refs when requestId changes
  useEffect(() => {
    console.log("useRequestDetailData - Request ID changed, resetting all controls");
    
    // Reset state
    setRefreshCounter(0);
    setLastRefreshTime(0);
    setIsRefreshing(false);
    
    // Reset refs
    initialDataLoadedRef.current = false;
    loadInProgressRef.current = false;
    refreshLockRef.current = true; // Start locked
    refreshCountRef.current = 0;
    visibilityChangeRef.current = false;
    
    // After a delay, unlock refresh lock to allow one manual refresh
    setTimeout(() => {
      console.log("useRequestDetailData - Unlocking refresh for manual action");
      refreshLockRef.current = false;
    }, 2000);
    
    return () => {
      console.log("useRequestDetailData - Cleaning up on requestId change");
    };
  }, [requestId]);

  // Block ALL visibility change refreshes completely
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("useRequestDetailData - Tab focus change detected, BLOCKING any refresh");
        visibilityChangeRef.current = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  
  // Use specialized hooks with the refresh counter
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(
    requestId, 
    refreshCounter
  );
  
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Mark initial load as completed once data is loaded
  useEffect(() => {
    if (!loading && request && !initialDataLoadedRef.current) {
      console.log("useRequestDetailData - Initial data load completed");
      initialDataLoadedRef.current = true;
      loadInProgressRef.current = false;
    }
  }, [loading, request]);
  
  // Listen for comments without triggering refresh
  useRequestCommentsSubscription(requestId, () => {
    console.log("New comment received - no automatic refresh");
  });
  
  // Strictly controlled refresh function
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Refresh requested");
    
    // Block tab visibility triggered refreshes completely
    if (visibilityChangeRef.current) {
      console.log("useRequestDetailData - BLOCKING refresh triggered by tab visibility change");
      visibilityChangeRef.current = false;
      return;
    }
    
    // Skip if no request ID
    if (!requestId) {
      console.log("useRequestDetailData - No request ID, skipping refresh");
      return;
    }
    
    // Strong refresh control - block if:
    // 1. Refresh is already in progress
    // 2. Refresh is locked (e.g. from auto-refresh on mount)
    // 3. Initial load is still in progress
    if (isRefreshing || refreshLockRef.current || loadInProgressRef.current) {
      console.log("useRequestDetailData - Refresh blocked: already refreshing, locked, or load in progress");
      return;
    }
    
    // Hard limit to one refresh per session
    if (refreshCountRef.current >= 1) {
      console.log("useRequestDetailData - Maximum refresh count reached, blocking further refreshes");
      return;
    }
    
    // Strict time-based throttling (5 seconds between refreshes)
    const now = Date.now();
    const MIN_REFRESH_INTERVAL = 5000; // 5 seconds
    
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log(`useRequestDetailData - Too soon since last refresh (${now - lastRefreshTime}ms), throttling`);
      return;
    }
    
    // Apply refresh lock
    refreshLockRef.current = true;
    loadInProgressRef.current = true;
    
    // Mark refresh as in progress and update last refresh time
    setIsRefreshing(true);
    setLastRefreshTime(now);
    refreshCountRef.current += 1;
    
    console.log(`useRequestDetailData - Starting refresh operation (attempt ${refreshCountRef.current})`);
    
    // First refresh request data from the database
    if (refreshRequestData) {
      refreshRequestData()
        .then(() => {
          console.log("useRequestDetailData - Base refresh complete, updating counter");
          
          // Increment counter to trigger other hooks to refresh
          setRefreshCounter(prev => prev + 1);
          
          // Reset refresh state after a short delay
          setTimeout(() => {
            console.log("useRequestDetailData - Refresh cycle complete");
            setIsRefreshing(false);
            loadInProgressRef.current = false;
            // Keep the lock to prevent more refreshes in this session
          }, 1000);
        })
        .catch(error => {
          console.error("useRequestDetailData - Error during refresh:", error);
          setIsRefreshing(false);
          loadInProgressRef.current = false;
        });
    } else {
      // Just increment counter to trigger hooks to refresh
      setRefreshCounter(prev => prev + 1);
      
      // Reset refresh state after a delay
      setTimeout(() => {
        setIsRefreshing(false);
        loadInProgressRef.current = false;
      }, 1000);
    }
  }, [requestId, isRefreshing, lastRefreshTime, refreshRequestData]);

  return {
    request,
    loading,
    quotes,
    isContractor,
    refreshData,
    isRefreshing
  };
};
