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

  // Load contractors function
  const loadContractors = useCallback(async () => {
    console.log("useContractorsState - Loading contractors, SessionReady:", isSessionReady);
    
    // CRITICAL: Wait for session to be ready before making queries
    if (!isSessionReady) {
      console.log("useContractorsState - Waiting for session ready...");
      return;
    }
    
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
  }, [isSessionReady]);

  // Load contractors on initial mount only if session is ready
  useEffect(() => {
    if (!isSessionReady) {
      console.log("useContractorsState - Initial mount, waiting for session ready");
      return;
    }
    console.log("useContractorsState - Initial mount, loading contractors");
    loadContractors();
  }, [isSessionReady, loadContractors]);

  // Register with visibility coordinator for coordinated refresh
  useEffect(() => {
    const refreshContractors = async () => {
      console.log('🔄 ContractorProvider - Coordinator-triggered refresh');
      if (isSessionReady) {
        await loadContractors();
      } else {
        console.log('🔄 ContractorProvider - Session not ready, skipping refresh');
      }
    };

    const unregister = visibilityCoordinator.onRefresh(refreshContractors);
    console.log('🔄 ContractorProvider - Registered with visibility coordinator');

    return () => {
      unregister();
      console.log('🔄 ContractorProvider - Cleanup: Unregistered from visibility coordinator');
    };
  }, [isSessionReady, loadContractors]);

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
