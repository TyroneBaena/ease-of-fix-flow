
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
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Combine refresh functions from child hooks
  const refreshData = useCallback(async () => {
    console.log("useRequestDetailData - Manual refresh requested");
    
    // Prevent multiple rapid refreshes
    if (isRefreshInProgress) {
      console.log("useRequestDetailData - Refresh already in progress, skipping");
      return;
    }
    
    setIsRefreshInProgress(true);
    
    try {
      if (refreshRequestData) {
        await refreshRequestData();
      }
      
      // Use setTimeout with a longer delay to break potential recursive update loops
      setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
        // Reset the refresh flag after a delay to allow new refreshes
        setTimeout(() => {
          setIsRefreshInProgress(false);
        }, 500);
      }, 300);
    } catch (error) {
      console.error("Error during refresh:", error);
      setIsRefreshInProgress(false);
    }
  }, [refreshRequestData, isRefreshInProgress]);

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
