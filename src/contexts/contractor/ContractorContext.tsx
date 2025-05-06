
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Contractor, Quote } from '@/types/contractor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { ContractorContextType } from './ContractorContextTypes';
import { fetchContractors } from './operations/contractorFetch';
import { assignContractorToRequest, changeContractorAssignment, requestQuoteForJob } from './operations/contractorOperations';
import { 
  submitQuoteForJob, 
  approveQuoteForJob, 
  rejectQuote 
} from './operations/quoteOperations';
import { updateJobProgressStatus } from './operations/progressOperations';

const ContractorContext = createContext<ContractorContextType | undefined>(undefined);

export const useContractorContext = () => {
  const context = useContext(ContractorContext);
  if (!context) {
    throw new Error('useContractorContext must be used within a ContractorProvider');
  }
  return context;
};

export const ContractorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    try {
      setLoading(true);
      const data = await fetchContractors();
      setContractors(data);
      setError(null);
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

  const handleRejectQuote = async (quoteId: string) => {
    try {
      await rejectQuote(quoteId);
      toast.success('Quote rejected');
    } catch (err) {
      console.error('Error rejecting quote:', err);
      toast.error('Failed to reject quote');
      throw err;
    }
  };

  const updateJobProgress = async (requestId: string, progress: number, notes?: string, completionPhotos?: Array<{ url: string }>) => {
    try {
      await updateJobProgressStatus(requestId, progress, notes, completionPhotos);
      toast.success('Progress updated successfully');
    } catch (err) {
      console.error('Error updating progress:', err);
      toast.error('Failed to update progress');
      throw err;
    }
  };

  return (
    <ContractorContext.Provider value={{
      contractors,
      loading,
      error,
      loadContractors,
      assignContractor,
      changeAssignment,
      requestQuote,
      submitQuote,
      approveQuote,
      rejectQuote: handleRejectQuote,
      updateJobProgress,
    }}>
      {children}
    </ContractorContext.Provider>
  );
};
