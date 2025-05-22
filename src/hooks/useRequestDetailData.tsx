
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestData } from './request-detail/useMaintenanceRequestData';
import { useRequestQuotes } from './request-detail/useRequestQuotes';
import { useContractorStatus } from './request-detail/useContractorStatus';
import { useRequestCommentsSubscription } from './request-detail/useRequestCommentsSubscription';
import { toast } from 'sonner';

/**
 * Main hook for managing request detail data, combining several smaller hooks
 * - Controls refresh operations with strict lockout
 */
export const useRequestDetailData = (requestId: string | undefined) => {
  const { currentUser } = useUserContext();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Refs for controlling refresh behavior
  const lastRefreshTimeRef = useRef(Date.now());
  const initialDataLoadedRef = useRef(false);
  const loadInProgressRef = useRef(false);
  const refreshLockRef = useRef(true); // Start locked
  const refreshCountRef = useRef(0);
  const currentRequestIdRef = useRef<string | undefined>(requestId);
  const isMountedRef = useRef(true);
  
  // IMPORTANT: Clear state on unmount to prevent memory leaks and updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Use specialized hooks with the refresh counter - but only if we have a valid requestId
  const { request, loading, refreshRequestData } = useMaintenanceRequestData(
    requestId, 
    refreshCounter
  );
  
  // Only fetch quotes if we have a valid requestId
  const quotes = useRequestQuotes(requestId, refreshCounter);
  
  // Check contractor status (depends on currentUser, not requestId)
  const isContractor = useContractorStatus(currentUser?.id);
  
  // Mark initial load as completed once data is loaded
  useEffect(() => {
    if (!loading && request && !initialDataLoadedRef.current && isMountedRef.current) {
      initialDataLoadedRef.current = true;
      loadInProgressRef.current = false;
      
      // After a delay, unlock refresh lock to allow one manual refresh
      setTimeout(() => {
        if (isMountedRef.current) {
          refreshLockRef.current = false;
        }
      }, 2000);
    }
  }, [loading, request]);
  
  // Listen for comments without triggering refresh
  useRequestCommentsSubscription(requestId, () => {
    // No automatic refresh on comments to prevent infinite loops
  });
  
  // Strictly controlled refresh function with additional safety
  const refreshData = useCallback(() => {
    // Skip if component is unmounted
    if (!isMountedRef.current) return;
    
    // Skip if no request ID
    if (!requestId) return;
    
    // Strong refresh control - block if:
    // 1. Refresh is already in progress
    // 2. Refresh is locked (e.g. from auto-refresh on mount)
    // 3. Initial load is still in progress
    if (isRefreshing || refreshLockRef.current || loadInProgressRef.current) {
      return;
    }
    
    // Hard limit to one refresh per session
    if (refreshCountRef.current >= 1) {
      return;
    }
    
    // Strict time-based throttling (5 seconds between refreshes)
    const MIN_REFRESH_INTERVAL = 5000; // 5 seconds
    const now = Date.now();
    
    if (now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }
    
    // Apply refresh lock
    refreshLockRef.current = true;
    loadInProgressRef.current = true;
    
    // Mark refresh as in progress and update last refresh time
    if (isMountedRef.current) {
      setIsRefreshing(true);
      lastRefreshTimeRef.current = now;
      refreshCountRef.current += 1;
    
      // First refresh request data from the database
      if (refreshRequestData) {
        refreshRequestData()
          .then(() => {
            // Skip updates if component unmounted
            if (!isMountedRef.current) return;
            
            // Increment counter to trigger other hooks to refresh
            setRefreshCounter(prev => prev + 1);
            
            // Reset refresh state after a short delay
            setTimeout(() => {
              if (isMountedRef.current) {
                setIsRefreshing(false);
                loadInProgressRef.current = false;
              }
            }, 1000);
          })
          .catch(error => {
            // Skip updates if component unmounted
            if (!isMountedRef.current) return;
            
            console.error("useRequestDetailData - Error during refresh:", error);
            setIsRefreshing(false);
            loadInProgressRef.current = false;
          });
      } else {
        // Just increment counter to trigger hooks to refresh
        setRefreshCounter(prev => prev + 1);
        
        // Reset refresh state after a delay
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsRefreshing(false);
            loadInProgressRef.current = false;
          }
        }, 1000);
      }
    }
  }, [requestId, isRefreshing, refreshRequestData]);
  
  // Function to call after quote submission specifically
  const refreshAfterQuoteSubmission = useCallback(() => {
    // Skip if component unmounted
    if (!isMountedRef.current) return;
    
    // Wait a moment before refreshing to avoid race conditions
    setTimeout(() => {
      if (isMountedRef.current && requestId === currentRequestIdRef.current) {
        refreshData();
      }
    }, 1000);
  }, [refreshData, requestId]);

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
