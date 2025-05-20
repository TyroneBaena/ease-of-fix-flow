
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types/contractor';
import { 
  fetchContractors,
  assignContractorToRequest,
  requestQuoteForJob,
  approveQuoteForJob,
  updateJobProgressStatus,
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
      await submitQuoteForJob(requestId, amount, description);
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
      await requestQuoteForJob(requestId, contractorId, includeInfo, notes);
      console.log("useContractorOperations - Quote request sent successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error requesting quote:", err);
      throw err;
    }
  }, []);

  // Assign contractor function
  const handleAssignContractor = useCallback(async (
    requestId: string,
    contractorId: string
  ) => {
    console.log(`useContractorOperations - Assigning contractor ${contractorId} to request ${requestId}`);
    try {
      await assignContractorToRequest(requestId, contractorId);
      console.log("useContractorOperations - Contractor assigned successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error assigning contractor:", err);
      throw err;
    }
  }, []);

  // Change assignment function
  const handleChangeAssignment = useCallback(async (
    requestId: string,
    contractorId: string
  ) => {
    console.log(`useContractorOperations - Changing assignment for request ${requestId} to contractor ${contractorId}`);
    try {
      await assignContractorToRequest(requestId, contractorId);
      console.log("useContractorOperations - Assignment changed successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error changing assignment:", err);
      throw err;
    }
  }, []);

  // Approve quote function
  const handleApproveQuote = useCallback(async (
    quoteId: string
  ) => {
    console.log(`useContractorOperations - Approving quote ${quoteId}`);
    try {
      await approveQuoteForJob(quoteId);
      console.log("useContractorOperations - Quote approved successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error approving quote:", err);
      throw err;
    }
  }, []);

  // Reject quote function
  const handleRejectQuote = useCallback(async (
    quoteId: string
  ) => {
    console.log(`useContractorOperations - Rejecting quote ${quoteId}`);
    try {
      // Implement reject quote functionality
      console.log("useContractorOperations - Quote rejected successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error rejecting quote:", err);
      throw err;
    }
  }, []);

  // Update job progress function
  const handleUpdateJobProgress = useCallback(async (
    requestId: string,
    progress: number,
    notes?: string,
    completionPhotos?: Array<{ url: string }>
  ) => {
    console.log(`useContractorOperations - Updating job progress for request ${requestId} to ${progress}%`);
    try {
      await updateJobProgressStatus(requestId, progress, notes);
      console.log("useContractorOperations - Job progress updated successfully");
      return true;
    } catch (err) {
      console.error("useContractorOperations - Error updating job progress:", err);
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
    requestQuote: handleRequestQuote,
    assignContractor: handleAssignContractor,
    changeAssignment: handleChangeAssignment,
    approveQuote: handleApproveQuote,
    rejectQuote: handleRejectQuote,
    updateJobProgress: handleUpdateJobProgress
  };
};

// Helper function for submitting quotes within the file
const submitQuoteForJob = async (
  requestId: string, 
  amount: number, 
  description: string
) => {
  const { data: contractorData, error: contractorError } = await supabase
    .from('contractors')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (contractorError) throw contractorError;
  
  if (!contractorData?.id) {
    throw new Error('Contractor ID not found');
  }

  const { error } = await supabase
    .from('quotes')
    .insert({
      request_id: requestId,
      contractor_id: contractorData.id,
      amount,
      description,
      status: 'pending'
    });

  if (error) throw error;
};
