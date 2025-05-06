
import { useState } from 'react';
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
  
  // Use our specialized hooks to fetch and manage the data
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(requestId, refreshCounter);
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Combine refresh functions from child hooks
  const refreshData = async () => {
    console.log("useRequestDetailData - Manual refresh requested");
    
    // Prevent multiple rapid refreshes
    const shouldRefresh = true; // We can add a debounce mechanism here if needed
    
    if (shouldRefresh) {
      if (refreshRequestData) {
        await refreshRequestData();
      }
      
      // Use setTimeout to break potential recursive update loops
      setTimeout(() => {
        setRefreshCounter(prev => prev + 1);
      }, 100);
    }
  };

  return {
    request,
    loading,
    quotes,
    isContractor,
    refreshData
  };
};
