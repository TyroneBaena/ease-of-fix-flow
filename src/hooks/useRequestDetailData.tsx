
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';
import { toast } from '@/lib/toast';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 * - REFRESH DISABLED FOR TROUBLESHOOTING
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshLockRef = useRef(false);
  const maxRefreshAttemptsRef = useRef(0);
  
  // Reset refresh counter when the requestId changes - but don't force fresh data load
  useEffect(() => {
    console.log("useRequestDetailData - Request ID changed, resetting refresh counter");
    setRefreshCounter(0);
    setLastRefreshTime(0);
    setIsRefreshing(false);
    refreshLockRef.current = false;
    maxRefreshAttemptsRef.current = 0;
  }, [requestId]);
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Setup real-time comments subscription - without auto refresh
  useRequestCommentsSubscription(requestId, () => {
    console.log("New comment received - auto refresh DISABLED for troubleshooting");
  });
  
  // DISABLED automatic refresh - Using stub function that logs but doesn't refresh
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Manual refresh requested but DISABLED for troubleshooting");
    
    // Uncomment to re-enable
    /*
    console.log("useRequestDetailData - Refresh requested");
    
    // Skip if request ID is missing
    if (!requestId) {
      console.log("useRequestDetailData - No request ID, skipping refresh");
      return;
    }
    
    // Hard limit on number of refreshes per session to prevent infinite loops
    if (maxRefreshAttemptsRef.current >= 3) {
      console.log("useRequestDetailData - Maximum refresh attempts reached, blocking further refreshes");
      return;
    }
    
    // Skip if already refreshing
    if (isRefreshing || refreshLockRef.current) {
      console.log("useRequestDetailData - Already refreshing or locked, skipping");
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
    maxRefreshAttemptsRef.current += 1;
    
    console.log(`useRequestDetailData - Starting refresh operation (attempt ${maxRefreshAttemptsRef.current})`);
    
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
            // Release the lock after a safe period to prevent immediate re-triggering
            setTimeout(() => {
              refreshLockRef.current = false;
            }, 2000);
          }, 1000);
        })
        .catch(error => {
          console.error("useRequestDetailData - Error during refresh:", error);
          // Don't show toast here as it may cause duplicate notifications
          setIsRefreshing(false);
          refreshLockRef.current = false;
        });
    } else {
      // Just increment counter to trigger hooks to refresh
      setRefreshCounter(prev => prev + 1);
      
      // Reset refresh state after a delay
      setTimeout(() => {
        setIsRefreshing(false);
        // Release the lock after a safe period
        setTimeout(() => {
          refreshLockRef.current = false;
        }, 2000);
      }, 1000);
    }
    */
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
