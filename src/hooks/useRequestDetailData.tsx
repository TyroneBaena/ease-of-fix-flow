
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';
import { toast } from '@/lib/toast';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshLockRef = useRef(false);
  
  // Reset refresh counter when the requestId changes to force fresh data load
  useEffect(() => {
    console.log("useRequestDetailData - Request ID changed, resetting refresh counter");
    setRefreshCounter(0);
    setLastRefreshTime(0);
    setIsRefreshing(false);
    refreshLockRef.current = false;
  }, [requestId]);
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Setup real-time comments subscription
  useRequestCommentsSubscription(requestId, () => {
    console.log("New comment received, no refresh needed as comments are loaded separately");
  });
  
  // Implement a refresh function with better protection against multiple calls
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Refresh requested");
    
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
    
    // Implement time-based throttling (3 seconds between refreshes)
    const now = Date.now();
    const MIN_REFRESH_INTERVAL = 3000; // 3 seconds
    
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log(`useRequestDetailData - Too soon since last refresh (${now - lastRefreshTime}ms), throttling`);
      return;
    }
    
    // Add an additional refresh lock to prevent potential race conditions
    refreshLockRef.current = true;
    
    // Mark refresh as in progress and update last refresh time
    setIsRefreshing(true);
    setLastRefreshTime(now);
    
    console.log("useRequestDetailData - Starting refresh operation");
    
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
            }, 1000);
          }, 500);
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
        }, 1000);
      }, 500);
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
