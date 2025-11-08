import { useState, useCallback, useEffect, useRef } from 'react';
import { Contractor } from '@/types/contractor';
import { fetchContractors } from '../operations';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';

/**
 * v78.0 - SIMPLIFIED - Pure data fetching
 */
export const useContractorsState = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isSessionReady, currentUser } = useUnifiedAuth();
  const authStateRef = useRef({ isSessionReady, currentUser });
  
  useEffect(() => {
    authStateRef.current = { isSessionReady, currentUser };
  }, [isSessionReady, currentUser]);

  const loadContractors = useCallback(async () => {
    const { isSessionReady: sessionReady } = authStateRef.current;
    console.log("v78.0 - useContractorsState - Loading contractors", { sessionReady });
    
    if (!sessionReady) {
      console.log("v78.0 - useContractorsState - Waiting for session ready...");
      return;
    }
    
    setLoading(true);
    
    try {
      const contractorsList = await fetchContractors();
      console.log("v78.0 - useContractorsState - Loaded:", contractorsList.length);
      setContractors(contractorsList);
      setError(null);
    } catch (err) {
      console.error("v78.0 - useContractorsState - Error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionReady) {
      console.log("useContractorsState - Waiting for session ready");
      return;
    }
    console.log("useContractorsState - Initial load");
    loadContractors();
  }, [isSessionReady, loadContractors]);

  return {
    contractors,
    loading,
    error,
    loadContractors,
    setLoading,
    setError
  };
};
