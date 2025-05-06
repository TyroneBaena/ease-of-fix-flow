
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
  const [isRefreshAllowed, setIsRefreshAllowed] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshOperationCompleteRef = useRef(false);
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (refreshLockTimeoutRef.current) {
        clearTimeout(refreshLockTimeoutRef.current);
      }
    };
  }, []);
  
  // Function to temporarily block refreshes to prevent multiple clicks or infinite loops
  const lockRefreshes = useCallback((duration: number = 15000) => {
    console.log("useRequestDetailData - Locking refreshes for", duration, "ms");
    setIsRefreshAllowed(false);
    
    if (refreshLockTimeoutRef.current) {
      clearTimeout(refreshLockTimeoutRef.current);
    }
    
    refreshLockTimeoutRef.current = setTimeout(() => {
      console.log("useRequestDetailData - Refreshes unlocked");
      setIsRefreshAllowed(true);
      refreshLockTimeoutRef.current = null;
    }, duration) as unknown as NodeJS.Timeout;
  }, []);
  
  // Combine refresh functions from child hooks with strong protection against loops
  const refreshData = useCallback(() => {
    console.log("useRequestDetailData - Manual refresh requested");
    
    // First protection: Check if refreshes are currently locked
    if (!isRefreshAllowed) {
      console.log("useRequestDetailData - Refreshes are locked, skipping");
      return Promise.resolve();
    }
    
    // Second protection: Check if a refresh is already in progress
    if (isRefreshInProgress) {
      console.log("useRequestDetailData - Refresh already in progress, skipping");
      return Promise.resolve();
    }
    
    // Third protection: Add time-based debouncing - prevent refreshes within 12 seconds
    const currentTime = Date.now();
    if (currentTime - lastRefreshTime < 12000) {
      console.log("useRequestDetailData - Too soon since last refresh, debouncing");
      return Promise.resolve();
    }
    
    // Clear any existing timeout to prevent multiple timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Immediately lock refreshes to prevent rapid repeat actions
    lockRefreshes(15000);
    
    // Set state variables to track this refresh cycle
    setIsRefreshInProgress(true);
    setLastRefreshTime(currentTime);
    refreshOperationCompleteRef.current = false;
    
    // Execute the actual refresh operation
    console.log("useRequestDetailData - Starting controlled refresh operation");
    return new Promise<void>((resolve) => {
      const refreshPromise = refreshRequestData ? 
        refreshRequestData() : 
        Promise.resolve();
      
      refreshPromise
        .then(() => {
          if (refreshOperationCompleteRef.current) {
            console.log("useRequestDetailData - Refresh operation already completed, skipping");
            setIsRefreshInProgress(false);
            resolve();
            return;
          }
          
          // Mark operation as complete to prevent duplicate processing
          refreshOperationCompleteRef.current = true;
          
          // After base operation completes, increment counter with delay
          setTimeout(() => {
            console.log("useRequestDetailData - Incrementing refresh counter");
            setRefreshCounter(prev => prev + 1);
            
            // Allow the system to fully process this change before resetting flags
            refreshTimeoutRef.current = setTimeout(() => {
              console.log("useRequestDetailData - Reset isRefreshInProgress flag");
              setIsRefreshInProgress(false);
              resolve();
            }, 8000) as unknown as NodeJS.Timeout;
          }, 2000);
        })
        .catch(error => {
          console.error("Error during refresh:", error);
          setIsRefreshInProgress(false);
          resolve(); 
        });
    });
  }, [refreshRequestData, isRefreshInProgress, lastRefreshTime, isRefreshAllowed, lockRefreshes]);

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
