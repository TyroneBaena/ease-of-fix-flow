
import { useState } from 'react';
import { Contractor } from '@/types/contractor';
import { toast } from '@/lib/toast';
import { fetchContractors } from './operations/contractorFetch';
import { 
  assignContractorToRequest, 
  requestQuoteForJob,
  changeContractorAssignment
} from './operations';
import { 
  submitQuoteForJob, 
  approveQuoteForJob, 
  rejectQuote 
} from './operations';
import { updateJobProgressStatus } from './operations';
import { supabase } from '@/lib/supabase';

export const useContractorOperations = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadContractors = async () => {
    try {
      // Check if we already have contractors loaded
      if (contractors.length > 0) {
        console.log("Contractors already loaded, skipping fetch");
        return;
      }
      
      // Check if user is authenticated before loading contractors
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        console.log("No authenticated user, skipping contractor loading");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log("Fetching contractors...");
      const contractorsData = await fetchContractors();
      console.log("Fetched contractors:", contractorsData);
      setContractors(contractorsData);
      setError(null);
    } catch (err) {
      console.error("Error loading contractors:", err);
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
  
  const changeAssignment = async (requestId: string, contractorId: string) => {
    try {
      await changeContractorAssignment(requestId, contractorId);
      toast.success('Contractor reassigned successfully');
    } catch (err) {
      console.error('Error reassigning contractor:', err);
      toast.error('Failed to reassign contractor');
      throw err;
    }
  };

  const requestQuote = async (requestId: string, contractorId: string, includeInfo = {}, notes = '') => {
    try {
      await requestQuoteForJob(requestId, contractorId, includeInfo, notes);
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
      return true;
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
      return true;
    } catch (err) {
      console.error('Error approving quote:', err);
      toast.error('Failed to approve quote');
      throw err;
    }
  };
  
  const rejectQuoteAction = async (quoteId: string) => {
    try {
      await rejectQuote(quoteId);
      toast.success('Quote rejected');
      return true;
    } catch (err) {
      console.error('Error rejecting quote:', err);
      toast.error('Failed to reject quote');
      throw err;
    }
  };

  const updateJobProgress = async (
    requestId: string, 
    progress: number, 
    notes?: string, 
    completionPhotos?: Array<{ url: string }>
  ) => {
    try {
      await updateJobProgressStatus(requestId, progress, notes, completionPhotos);
      toast.success('Progress updated successfully');
      return true;
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
    changeAssignment,
    requestQuote,
    submitQuote,
    approveQuote,
    rejectQuote: rejectQuoteAction,
    updateJobProgress,
  };
};
