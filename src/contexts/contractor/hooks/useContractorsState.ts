import { useState, useCallback, useEffect, useRef } from 'react';
import { Contractor } from '@/types/contractor';
import { fetchContractors } from '../operations';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

/**
 * v57.0 - Hook for managing contractors state with 30s timeout
 */
export const useContractorsState = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isSessionReady, currentUser } = useUnifiedAuth();
  // CRITICAL: Track if we've completed initial load to prevent loading flashes on tab switches
  const hasCompletedInitialLoadRef = useRef(false);
  // CRITICAL: Track last fetch time to enable smart refresh on tab visibility
  const lastFetchTimeRef = useRef<number>(0);
  
  // CRITICAL v55.0: Use refs to access CURRENT auth state (not stale closure)
  const authStateRef = useRef({ isSessionReady, currentUser });
  
  // Update ref whenever auth state changes
  useEffect(() => {
    authStateRef.current = { isSessionReady, currentUser };
  }, [isSessionReady, currentUser]);

  // v77.0: CRITICAL FIX - Subscribe to coordinator's instant reset
  useEffect(() => {
    const unsubscribe = visibilityCoordinator.onTabRefreshChange((isRefreshing) => {
      if (!isRefreshing && hasCompletedInitialLoadRef.current) {
        // Instant reset: Clear loading immediately on tab return
        console.log('⚡ v77.0 - Contractors - Instant loading reset from coordinator');
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  // CRITICAL v57.0: Stable callback with 30s timeout
  const loadContractors = useCallback(async () => {
    const { isSessionReady: sessionReady } = authStateRef.current;
    console.log("v57.0 - useContractorsState - Loading contractors", { sessionReady });
    
    // CRITICAL: Wait for session to be ready before making queries
    if (!sessionReady) {
      console.log("v57.0 - useContractorsState - Waiting for session ready...");
      return;
    }
    
    // v77.1: CRITICAL - NEVER set loading after initial load
    // Background refreshes must be completely silent
    if (!hasCompletedInitialLoadRef.current) {
      setLoading(true);
    } else {
      console.log('🔕 v77.1 - Contractors - SILENT REFRESH - Skipping loading state');
    }
    
    // v57.0: Add 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("⏱️ v57.0 - Contractor fetch timeout after 30s");
    }, 30000);
    
    try {
      const contractorsList = await fetchContractors();
      clearTimeout(timeoutId);
      console.log("v57.0 - useContractorsState - Contractors loaded successfully:", contractorsList.length);
      setContractors(contractorsList);
      setError(null);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("v57.0 - useContractorsState - Error loading contractors:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      // CRITICAL: Only reset loading on first load, keep it false after
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(false);
      }
      hasCompletedInitialLoadRef.current = true;
    }
  }, []); // CRITICAL v57.0: Empty deps - callback uses ref for current values

  // Load contractors on initial mount only if session is ready
  useEffect(() => {
    if (!isSessionReady) {
      console.log("useContractorsState - Initial mount, waiting for session ready");
      return;
    }
    console.log("useContractorsState - Initial mount, loading contractors");
    loadContractors();
  }, [isSessionReady, loadContractors]);

  // CRITICAL v77.3: REMOVED - Let React Query handle refetching automatically
  // useEffect(() => {
  //   console.log('🔄 v55.0 - ContractorProvider - Handler registration DISABLED');
  //   return () => {};
  // }, [loadContractors]);

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
