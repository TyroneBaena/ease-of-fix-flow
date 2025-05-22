
import { useState, useCallback, useEffect } from 'react';
import { Contractor } from '@/types/contractor';
import { fetchContractors } from '../operations';

/**
 * Hook for managing contractors state and loading operations
 */
export const useContractorsState = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load contractors function
  const loadContractors = useCallback(async () => {
    console.log("useContractorsState - Loading contractors");
    setLoading(true);
    try {
      const contractorsList = await fetchContractors();
      console.log("useContractorsState - Contractors loaded successfully:", contractorsList);
      setContractors(contractorsList);
      setError(null);
    } catch (err) {
      console.error("useContractorsState - Error loading contractors:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load contractors on initial mount
  useEffect(() => {
    console.log("useContractorsState - Initial mount, loading contractors");
    loadContractors();
  }, [loadContractors]);

  return {
    contractors,
    loading,
    error,
    loadContractors,
    setLoading,
    setError
  };
};
