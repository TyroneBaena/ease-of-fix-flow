
import { useState, useEffect, useCallback } from 'react';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';
import { useActivityLogs } from './request-detail/useActivityLogs';
import { toast } from 'sonner';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 * v78.0: Simplified - removed tab refresh state tracking
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser, isSessionReady } = useSimpleAuth();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use specialized hooks with the refresh counter and session ready flag
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(
    requestId, 
    refreshCounter,
    isSessionReady
  );
  
  const quotes = useRequestQuotes(requestId, refreshCounter, isSessionReady);
  const isContractor = useContractorStatus(currentUser?.id, isSessionReady);
  const { activityLogs, loading: activityLoading } = useActivityLogs(requestId, refreshCounter, isSessionReady);
  
  // Listen for comments but don't auto-refresh on every comment
  useRequestCommentsSubscription(requestId, () => {
    console.log('New comment received');
    // Don't automatically refresh data on every comment to prevent excessive loading
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
          }, 500); // Reduced timeout to make refresh feel more responsive
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
      }, 500);
    }
  }, [isRefreshing, refreshRequestData]);
  
  const refreshAfterQuoteSubmission = useCallback(() => {
    // Only refresh after a brief delay to ensure database operations are complete
    setTimeout(() => {
      refreshData();
    }, 500); // Reduced delay
  }, [refreshData]);

  return {
    request,
    loading,
    quotes,
    isContractor,
    activityLogs,
    activityLoading,
    refreshData,
    refreshAfterQuoteSubmission,
    isRefreshing
  };
};
