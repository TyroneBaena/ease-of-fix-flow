import { useState, useCallback, useEffect, useRef } from 'react';
import { Contractor } from '@/types/contractor';
import { fetchContractors } from '../operations';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

/**
 * Hook for managing contractors state and loading operations
 */
export const useContractorsState = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isSessionReady } = useUnifiedAuth();
  // CRITICAL: Track if we've completed initial load to prevent loading flashes on tab switches
  const hasCompletedInitialLoadRef = useRef(false);
  // CRITICAL: Track last fetch time to enable smart refresh on tab visibility
  const lastFetchTimeRef = useRef<number>(0);

  // CRITICAL v54.0: Stabilize callback with proper session checks
  const loadContractors = useCallback(async () => {
    const sessionReady = isSessionReady;
    console.log("v54.0 - useContractorsState - Loading contractors", { sessionReady });
    
    // CRITICAL: Wait for session to be ready before making queries
    if (!sessionReady) {
      console.log("v54.0 - useContractorsState - Waiting for session ready...");
      return;
    }
    
    // CRITICAL: Only set loading on first fetch to prevent flash on tab switches
    if (!hasCompletedInitialLoadRef.current) {
      setLoading(true);
    }
    
    try {
      const contractorsList = await fetchContractors();
      console.log("v54.0 - useContractorsState - Contractors loaded successfully:", contractorsList.length);
      setContractors(contractorsList);
      setError(null);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      console.error("v54.0 - useContractorsState - Error loading contractors:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      // CRITICAL: Only reset loading on first load, keep it false after
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(false);
      }
      hasCompletedInitialLoadRef.current = true;
    }
  }, []); // CRITICAL: Removed isSessionReady from deps - now stable

  // Load contractors on initial mount only if session is ready
  useEffect(() => {
    if (!isSessionReady) {
      console.log("useContractorsState - Initial mount, waiting for session ready");
      return;
    }
    console.log("useContractorsState - Initial mount, loading contractors");
    loadContractors();
  }, [isSessionReady, loadContractors]);

  // CRITICAL v54.0: Register handler ONCE on mount with proper cleanup
  useEffect(() => {
    console.log('🔄 v54.0 - ContractorProvider - Registering handler (once on mount)');

    const refreshContractors = async () => {
      console.log('🔄 v54.0 - ContractorProvider - Coordinator-triggered refresh');
      await loadContractors();
    };

    const unregister = visibilityCoordinator.onRefresh(refreshContractors);
    console.log('🔄 v54.0 - ContractorProvider - Handler registered');

    return () => {
      console.log('🔄 v54.0 - ContractorProvider - Cleanup: Unregistering handler');
      unregister();
      console.log('🔄 v54.0 - ContractorProvider - Cleanup complete');
    };
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
