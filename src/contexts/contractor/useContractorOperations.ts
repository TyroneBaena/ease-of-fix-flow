import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types/contractor';
import { 
  fetchContractors, 
  submitQuote,
  requestQuote, 
  IncludeInfo 
} from './operations';

export const useContractorOperations = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load contractors function
  const loadContractors = useCallback(async () => {
    console.log("useContractorOperations - Loading contractors");
    setLoading(true);
    try {
      const contractorsList = await fetchContractors();
      console.log("useContractorOperations - Contractors loaded successfully:", contractorsList);
      setContractors(contractorsList);
      setError(null);
    } catch (err) {
      console.error("useContractorOperations - Error loading contractors:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit quote function
  const handleSubmitQuote = useCallback(async (
    requestId: string, 
    amount: number, 
    description: string
  ) => {
    console.log(`useContractorOperations - Submitting quote for request ${requestId}`);
    try {
      await submitQuote(requestId, amount, description);
      console.log("useContractorOperations - Quote submitted successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error submitting quote:", err);
      throw err;
    }
  }, []);

  // Request quote function
  const handleRequestQuote = useCallback(async (
    requestId: string,
    contractorId: string,
    includeInfo: IncludeInfo,
    notes: string
  ) => {
    console.log(`useContractorOperations - Requesting quote for request ${requestId} from contractor ${contractorId}`);
    try {
      await requestQuote(requestId, contractorId, includeInfo, notes);
      console.log("useContractorOperations - Quote request sent successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error requesting quote:", err);
      throw err;
    }
  }, []);

  // Load contractors on initial mount
  useEffect(() => {
    console.log("useContractorOperations - Initial mount, loading contractors");
    loadContractors();
  }, [loadContractors]);

  return {
    contractors,
    loading,
    error,
    loadContractors,
    submitQuote: handleSubmitQuote,
    requestQuote: handleRequestQuote
  };
};
