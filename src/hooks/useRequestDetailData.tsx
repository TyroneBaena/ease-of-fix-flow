
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';
import { toast } from '@/lib/toast';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 * - Controls refresh operations with strict lockout
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshLockRef = useRef(false);
  const refreshCountRef = useRef(0);
  const initialLoadCompletedRef = useRef(false);
  const visibilityChangedRef = useRef(false);
  
  // Reset refresh counter when the requestId changes - but don't force fresh data load
  useEffect(() => {
    console.log("useRequestDetailData - Request ID changed, resetting refresh counter");
    setRefreshCounter(0);
    setLastRefreshTime(0);
    setIsRefreshing(false);
    refreshLockRef.current = false;
    refreshCountRef.current = 0;
    initialLoadCompletedRef.current = false;
    visibilityChangedRef.current = false;
    
    return () => {
      // Cleanup function
      console.log("useRequestDetailData - Cleaning up on requestId change");
    };
  }, [requestId]);

  // Handle visibility change events at the hook level
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("useRequestDetailData - Tab focus detected, marking visibility change");
        visibilityChangedRef.current = true;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Mark initial load as completed once data is loaded
  useEffect(() => {
    if (!loading && request && !initialLoadCompletedRef.current) {
      console.log("useRequestDetailData - Initial load completed");
      initialLoadCompletedRef.current = true;
    }
  }, [loading, request]);
  
  // Setup real-time comments subscription - without auto refresh
  useRequestCommentsSubscription(requestId, () => {
    console.log("New comment received - no automatic refresh");
  });
  
  // Controlled refresh function with proper safeguards
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Refresh requested");
    
    // Skip if refresh was triggered by visibility change
    if (visibilityChangedRef.current) {
      console.log("useRequestDetailData - Refresh blocked: triggered by tab focus");
      visibilityChangedRef.current = false;
      return;
    }
    
    // Skip if request ID is missing
    if (!requestId) {
      console.log("useRequestDetailData - No request ID, skipping refresh");
      return;
    }
    
    // Skip if already refreshing
    if (isRefreshing || refreshLockRef.current) {
      console.log("useRequestDetailData - Already refreshing or locked, skipping");
      return;
    }
    
    // Hard limit on number of refreshes per session to prevent infinite loops
    if (refreshCountRef.current >= 1) {  // Only allow one refresh per interaction
      console.log("useRequestDetailData - Maximum refresh count reached, blocking further refreshes");
      return;
    }
    
    // Implement stricter time-based throttling (5 seconds between refreshes)
    const now = Date.now();
    const MIN_REFRESH_INTERVAL = 5000; // 5 seconds
    
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log(`useRequestDetailData - Too soon since last refresh (${now - lastRefreshTime}ms), throttling`);
      return;
    }
    
    // Add an additional refresh lock to prevent potential race conditions
    refreshLockRef.current = true;
    
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
            // Keep the lock to prevent more refreshes in this session
          }, 1000);
        })
        .catch(error => {
          console.error("useRequestDetailData - Error during refresh:", error);
          setIsRefreshing(false);
          refreshLockRef.current = false;
        });
    } else {
      // Just increment counter to trigger hooks to refresh
      setRefreshCounter(prev => prev + 1);
      
      // Reset refresh state after a delay
      setTimeout(() => {
        setIsRefreshing(false);
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
