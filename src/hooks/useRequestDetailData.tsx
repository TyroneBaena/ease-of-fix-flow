
import { useState, useEffect, useCallback } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';
import { toast } from 'sonner';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use specialized hooks with the refresh counter
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(
    requestId, 
    refreshCounter
  );
  
  const quotes = useRequestQuotes(requestId, refreshCounter);
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Listen for comments
  useRequestCommentsSubscription(requestId, () => {
    console.log('New comment received, refreshing data...');
  });
  
  const refreshData = useCallback(() => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    if (refreshRequestData) {
      refreshRequestData()
        .then(() => {
          setRefreshCounter(prev => prev + 1);
          
          setTimeout(() => {
            setIsRefreshing(false);
          }, 1000);
        })
        .catch(error => {
          console.error("Error during refresh:", error);
          setIsRefreshing(false);
          toast.error("Failed to refresh data");
        });
    } else {
      setRefreshCounter(prev => prev + 1);
      
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  }, [isRefreshing, refreshRequestData]);
  
  const refreshAfterQuoteSubmission = useCallback(() => {
    setTimeout(() => {
      refreshData();
    }, 1000);
  }, [refreshData]);

  return {
    request,
    loading,
    quotes,
    isContractor,
    refreshData,
    refreshAfterQuoteSubmission,
    isRefreshing
  };
};
