
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isRefreshInProgress, setIsRefreshInProgress] = useState(false);
  
  // Use refs to track refresh state to avoid closure issues
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshInProgressRef = useRef<boolean>(false);
  const requestIdRef = useRef<string | undefined>(requestId);
  const refreshTimeoutRef = useRef<number | null>(null);
  
  // Update the ref when requestId changes
  useEffect(() => {
    requestIdRef.current = requestId;
    
    // Clear any pending refresh when request ID changes
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    return () => {
      // Clean up any pending timeout on unmount
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [requestId]);
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Setup real-time comments subscription
  useRequestCommentsSubscription(requestId, () => {
    console.log("New comment received, no refresh needed as comments are loaded separately");
  });
  
  // Reset refresh counter when the requestId changes to force fresh data load
  useEffect(() => {
    console.log("useRequestDetailData - Request ID changed, resetting refresh counter");
    setRefreshCounter(0);
    lastRefreshTimeRef.current = 0;
    refreshInProgressRef.current = false;
    setIsRefreshInProgress(false);
  }, [requestId]);
  
  // Implement a robust refresh function with improved throttling and state management
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Refresh requested");
    
    // Skip if request ID is missing
    if (!requestIdRef.current) {
      console.log("useRequestDetailData - No request ID, skipping refresh");
      return Promise.resolve();
    }
    
    // Use ref to check if refresh is in progress to avoid race conditions
    if (refreshInProgressRef.current) {
      console.log("useRequestDetailData - Refresh already in progress, skipping");
      return Promise.resolve();
    }
    
    // Implement time-based throttling (30 seconds between refreshes)
    const now = Date.now();
    const MIN_REFRESH_INTERVAL = 30000; // 30 seconds - increased to prevent rapid refreshes
    
    if (now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL) {
      console.log(`useRequestDetailData - Too soon since last refresh (${now - lastRefreshTimeRef.current}ms), throttling`);
      
      // Only schedule one pending refresh at a time
      if (!refreshTimeoutRef.current) {
        const delay = MIN_REFRESH_INTERVAL - (now - lastRefreshTimeRef.current);
        console.log(`useRequestDetailData - Scheduling delayed refresh in ${delay}ms`);
        
        refreshTimeoutRef.current = window.setTimeout(() => {
          console.log("useRequestDetailData - Executing delayed refresh");
          refreshTimeoutRef.current = null; // Clear the ref
          
          // Call refresh again now that enough time has passed
          if (requestIdRef.current) {
            refreshData();
          }
        }, delay) as unknown as number;
      } else {
        console.log("useRequestDetailData - A delayed refresh is already scheduled, skipping");
      }
      
      return Promise.resolve();
    }
    
    // Mark refresh as in progress
    refreshInProgressRef.current = true;
    setIsRefreshInProgress(true);
    lastRefreshTimeRef.current = now;
    
    console.log("useRequestDetailData - Starting refresh operation");
    
    // Execute refresh
    return new Promise<void>((resolve) => {
      // First refresh request data from the database
      const refreshPromise = refreshRequestData ? 
        refreshRequestData() : 
        Promise.resolve();
      
      refreshPromise
        .then(() => {
          console.log("useRequestDetailData - Base refresh complete, updating counter");
          
          // Increment counter to trigger other hooks to refresh
          setTimeout(() => {
            if (requestIdRef.current) { // Check if component is still mounted
              setRefreshCounter(prev => prev + 1);
              
              // Reset refresh state after allowing time for updates
              setTimeout(() => {
                console.log("useRequestDetailData - Refresh cycle complete");
                refreshInProgressRef.current = false;
                setIsRefreshInProgress(false);
                resolve();
              }, 2000); // Increased to ensure all updates are processed
            } else {
              console.log("useRequestDetailData - Component unmounted during refresh");
              refreshInProgressRef.current = false;
              setIsRefreshInProgress(false);
              resolve();
            }
          }, 1000); // Increased delay to prevent race conditions
        })
        .catch(error => {
          console.error("useRequestDetailData - Error during refresh:", error);
          refreshInProgressRef.current = false;
          setIsRefreshInProgress(false);
          resolve();
        });
    });
  }, [refreshRequestData]);

  return {
    request,
    loading,
    quotes,
    isContractor,
    refreshData,
    isRefreshing: isRefreshInProgress
  };
};
