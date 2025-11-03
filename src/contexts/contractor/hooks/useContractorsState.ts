
import { useState, useCallback, useEffect, useRef } from 'react';
import { Contractor } from '@/types/contractor';
import { fetchContractors } from '../operations';

/**
 * Hook for managing contractors state and loading operations
 */
export const useContractorsState = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // CRITICAL: Track if we've completed initial load to prevent loading flashes on tab switches
  const hasCompletedInitialLoadRef = useRef(false);
  // CRITICAL: Track last fetch time to enable smart refresh on tab visibility
  const lastFetchTimeRef = useRef<number>(0);

  // Load contractors function
  const loadContractors = useCallback(async () => {
    console.log("useContractorsState - Loading contractors");
    
    // CRITICAL: Only set loading on first fetch to prevent flash on tab switches
    if (!hasCompletedInitialLoadRef.current) {
      setLoading(true);
    }
    
    try {
      const contractorsList = await fetchContractors();
      console.log("useContractorsState - Contractors loaded successfully:", contractorsList);
      setContractors(contractorsList);
      setError(null);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      console.error("useContractorsState - Error loading contractors:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      // CRITICAL: Only reset loading on first load, keep it false after
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(false);
      }
      hasCompletedInitialLoadRef.current = true;
    }
  }, []);

  // Load contractors on initial mount
  useEffect(() => {
    console.log("useContractorsState - Initial mount, loading contractors");
    loadContractors();
  }, [loadContractors]);

  // CRITICAL: Tab visibility refresh - refetch data when tab becomes visible after 30+ seconds
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        const STALE_THRESHOLD = 30000; // 30 seconds
        
        if (timeSinceLastFetch > STALE_THRESHOLD) {
          console.log('👁️ ContractorProvider - Tab visible after', Math.round(timeSinceLastFetch / 1000), 's, refreshing data');
          loadContractors();
        } else {
          console.log('👁️ ContractorProvider - Tab visible but data fresh, skipping refresh');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadContractors]);

  return {
    contractors,
    // CRITICAL: Override loading to false after initial load completes
    // This prevents loading flashes on tab switches
    loading: hasCompletedInitialLoadRef.current ? false : loading,
    error,
    loadContractors,
    setLoading,
    setError
  };
};
