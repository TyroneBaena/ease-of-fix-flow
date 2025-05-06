
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 */
export const useRequestDetailData = (requestId: string | undefined, forceRefresh: number = 0) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(forceRefresh);
  const [isRefreshInProgress, setIsRefreshInProgress] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
  
  // Combine refresh functions from child hooks with debounce protection
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Manual refresh requested");
    
    // Prevent multiple rapid refreshes
    if (isRefreshInProgress) {
      console.log("useRequestDetailData - Refresh already in progress, skipping");
      return Promise.resolve(); // Return a resolved promise for chaining
    }
    
    // Add time-based debouncing - prevent refreshes within 5 seconds of each other
    const currentTime = Date.now();
    if (currentTime - lastRefreshTime < 5000) {
      console.log("useRequestDetailData - Too soon since last refresh, debouncing");
      return Promise.resolve(); // Return a resolved promise for chaining
    }
    
    // Clear any existing timeout to prevent multiple timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    setIsRefreshInProgress(true);
    setLastRefreshTime(currentTime);
    
    // Create a proper promise chain for the refresh operation
    return new Promise<void>((resolve) => {
      const refreshPromise = refreshRequestData ? 
        refreshRequestData() : 
        Promise.resolve();
      
      refreshPromise.then(() => {
        // Use setTimeout to create a delay before incrementing the counter
        const incrementCounterTimeout = setTimeout(() => {
          setRefreshCounter(prev => prev + 1);
          
          // Allow new refreshes after a longer delay
          refreshTimeoutRef.current = setTimeout(() => {
            console.log("useRequestDetailData - Reset isRefreshInProgress flag");
            setIsRefreshInProgress(false);
            resolve();
          }, 5000) as unknown as NodeJS.Timeout;
        }, 1000);
        
        // Store the timeout to be able to clear it if needed
        refreshTimeoutRef.current = incrementCounterTimeout as unknown as NodeJS.Timeout;
      }).catch(error => {
        console.error("Error during refresh:", error);
        setIsRefreshInProgress(false);
        resolve(); // Still resolve the promise in case of error
      });
    });
  }, [refreshRequestData, isRefreshInProgress, lastRefreshTime]);

  // Reset refresh counter when the requestId changes
  useEffect(() => {
    setRefreshCounter(forceRefresh);
  }, [requestId, forceRefresh]);

  return {
    request,
    loading,
    quotes,
    isContractor,
    refreshData,
    isRefreshing: isRefreshInProgress
  };
};
