
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ContractorContextType } from './ContractorContextTypes';
import { toast } from '@/lib/toast';
import { 
  fetchContractors,
  assignContractorToRequest 
} from './operations/contractorOperations';
import {
  requestQuoteForJob,
  submitQuoteForJob,
  approveQuoteForJob
} from './operations/quoteOperations';
import { updateJobProgressStatus } from './operations/progressOperations';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types/contractor';

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
      console.log("Fetching contractors...");
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contractors')
        .select('*');
        
      if (error) {
        throw error;
      }
      
      if (data) {
        // Map the snake_case database fields to camelCase for our TypeScript interfaces
        const mappedContractors: Contractor[] = data.map(item => ({
          id: item.id,
          userId: item.user_id,
          companyName: item.company_name,
          contactName: item.contact_name,
          email: item.email,
          phone: item.phone,
          address: item.address || undefined,
          specialties: item.specialties || undefined,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        
        console.log("Fetched contractors:", mappedContractors);
        setContractors(mappedContractors);
      }
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

  return (
    <ContractorContext.Provider value={{
      contractors,
      loading,
      error,
      assignContractor,
      requestQuote,
      submitQuote,
      approveQuote,
      updateJobProgress,
    }}>
      {children}
    </ContractorContext.Provider>
  );
};
