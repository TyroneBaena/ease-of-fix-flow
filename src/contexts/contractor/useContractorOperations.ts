
import { useState } from 'react';
import { Contractor } from '@/types/contractor';
import { toast } from '@/lib/toast';
import { fetchContractors } from './operations/contractorFetch';
import { assignContractorToRequest, requestQuoteForJob } from './operations/contractorOperations';
import { submitQuoteForJob, approveQuoteForJob } from './operations/quoteOperations';
import { updateJobProgressStatus } from './operations/progressOperations';
import { supabase } from '@/lib/supabase';

export const useContractorOperations = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadContractors = async () => {
    try {
      // Check if user is authenticated before loading contractors
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        console.log("No authenticated user, skipping contractor loading");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const contractorsData = await fetchContractors();
      setContractors(contractorsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
    } finally {
      setLoading(false);
    }
  };

  const assignContractor = async (requestId: string, contractorId: string) => {
    try {
      await assignContractorToRequest(requestId, contractorId);
      toast.success('Contractor assigned successfully');
    } catch (err) {
      console.error('Error assigning contractor:', err);
      toast.error('Failed to assign contractor');
      throw err;
    }
  };

  const requestQuote = async (requestId: string, contractorId: string) => {
    try {
      await requestQuoteForJob(requestId, contractorId);
      toast.success('Quote request sent to contractor');
    } catch (err) {
      console.error('Error requesting quote:', err);
      toast.error('Failed to request quote');
      throw err;
    }
  };

  const submitQuote = async (requestId: string, amount: number, description?: string) => {
    try {
      await submitQuoteForJob(requestId, amount, description);
      toast.success('Quote submitted successfully');
    } catch (err) {
      console.error('Error submitting quote:', err);
      toast.error('Failed to submit quote');
      throw err;
    }
  };

  const approveQuote = async (quoteId: string) => {
    try {
      await approveQuoteForJob(quoteId);
      toast.success('Quote approved and contractor assigned');
    } catch (err) {
      console.error('Error approving quote:', err);
      toast.error('Failed to approve quote');
      throw err;
    }
  };

  const updateJobProgress = async (requestId: string, progress: number, notes?: string) => {
    try {
      await updateJobProgressStatus(requestId, progress, notes);
      toast.success('Progress updated successfully');
    } catch (err) {
      console.error('Error updating progress:', err);
      toast.error('Failed to update progress');
      throw err;
    }
  };

  return {
    contractors,
    loading,
    error,
    loadContractors,
    assignContractor,
    requestQuote,
    submitQuote,
    approveQuote,
    updateJobProgress,
  };
};
