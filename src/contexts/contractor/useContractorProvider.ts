
import { useState, useEffect } from 'react';
import { Contractor } from '@/types/contractor';
import { toast } from '@/lib/toast';
import { 
  fetchContractors,
  assignContractorToRequest,
  requestQuoteForJob,
  submitQuoteForJob,
  approveQuoteForJob,
  updateJobProgressStatus
} from './contractorOperations';

export const useContractorProvider = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    try {
      const data = await fetchContractors();
      setContractors(data);
    } catch (err) {
      console.error('Error fetching contractors:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
      toast.error('Failed to load contractors');
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
    assignContractor,
    requestQuote,
    submitQuote,
    approveQuote,
    updateJobProgress,
  };
};
