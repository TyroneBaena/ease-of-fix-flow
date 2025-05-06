
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
    
    if (refreshRequestData) {
      await refreshRequestData();
    }
    
    // Increment refresh counter to trigger refetching in child hooks
    setRefreshCounter(prev => prev + 1);
  };

  return {
    request,
    loading,
    quotes,
    isContractor,
    refreshData
  };
};
