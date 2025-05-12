
import { useState, useEffect, useCallback } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  
  // Reset refresh counter when the requestId changes to force fresh data load
  useEffect(() => {
    console.log("useRequestDetailData - Request ID changed, resetting refresh counter");
    setRefreshCounter(0);
    setLastRefreshTime(0);
    setIsRefreshing(false);
  }, [requestId]);
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Setup real-time comments subscription
  useRequestCommentsSubscription(requestId, () => {
    console.log("New comment received, no refresh needed as comments are loaded separately");
  });
  
  // Implement a refresh function with basic throttling
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Refresh requested");
    
    // Skip if request ID is missing
    if (!requestId) {
      console.log("useRequestDetailData - No request ID, skipping refresh");
      return;
    }
    
    // Skip if already refreshing
    if (isRefreshing) {
      console.log("useRequestDetailData - Already refreshing, skipping");
      return;
    }
    
    // Implement time-based throttling (5 seconds between refreshes)
    const now = Date.now();
    const MIN_REFRESH_INTERVAL = 5000; // 5 seconds
    
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log(`useRequestDetailData - Too soon since last refresh (${now - lastRefreshTime}ms), throttling`);
      return;
    }
    
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
          
          // Reset refresh state after a delay
          setTimeout(() => {
            console.log("useRequestDetailData - Refresh cycle complete");
            setIsRefreshing(false);
          }, 500);
        })
        .catch(error => {
          console.error("useRequestDetailData - Error during refresh:", error);
          setIsRefreshing(false);
        });
    } else {
      // Just increment counter to trigger hooks to refresh
      setRefreshCounter(prev => prev + 1);
      
      // Reset refresh state after a delay
      setTimeout(() => {
        setIsRefreshing(false);
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
