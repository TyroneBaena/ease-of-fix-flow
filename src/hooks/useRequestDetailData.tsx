
import { useState, useEffect, useCallback } from 'react';
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
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Combine refresh functions from child hooks with improved debouncing
  const refreshData = useCallback(async () => {
    console.log("useRequestDetailData - Manual refresh requested");
    
    // Prevent multiple rapid refreshes
    if (isRefreshInProgress) {
      console.log("useRequestDetailData - Refresh already in progress, skipping");
      return;
    }
    
    // Add time-based debouncing - prevent refreshes within 2 seconds of each other
    const currentTime = Date.now();
    if (currentTime - lastRefreshTime < 2000) {
      console.log("useRequestDetailData - Too soon since last refresh, debouncing");
      return;
    }
    
    setIsRefreshInProgress(true);
    setLastRefreshTime(currentTime);
    
    try {
      if (refreshRequestData) {
        console.log("useRequestDetailData - Calling refreshRequestData");
        await refreshRequestData();
      }
      
      // Use a longer delay to break potential recursive update loops
      setTimeout(() => {
        console.log("useRequestDetailData - Incrementing refresh counter");
        setRefreshCounter(prev => prev + 1);
        
        // Reset the refresh flag after a longer delay
        setTimeout(() => {
          console.log("useRequestDetailData - Reset isRefreshInProgress flag");
          setIsRefreshInProgress(false);
        }, 1500);
      }, 800);
    } catch (error) {
      console.error("Error during refresh:", error);
      setIsRefreshInProgress(false);
    }
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
