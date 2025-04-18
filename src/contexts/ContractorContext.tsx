
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Contractor, Quote } from '@/types/contractor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

interface ContractorContextType {
  contractors: Contractor[];
  loading: boolean;
  error: Error | null;
  assignContractor: (requestId: string, contractorId: string) => Promise<void>;
  requestQuote: (requestId: string, contractorId: string) => Promise<void>;
  submitQuote: (requestId: string, amount: number, description?: string) => Promise<void>;
  approveQuote: (quoteId: string) => Promise<void>;
  updateJobProgress: (requestId: string, progress: number, notes?: string) => Promise<void>;
}

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
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*');

      if (error) throw error;

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

      setContractors(mappedContractors);
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
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          contractor_id: contractorId,
          assigned_at: new Date().toISOString(),
          status: 'in-progress'
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Contractor assigned successfully');
    } catch (err) {
      console.error('Error assigning contractor:', err);
      toast.error('Failed to assign contractor');
      throw err;
    }
  };

  const requestQuote = async (requestId: string, contractorId: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          quote_requested: true
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Quote request sent to contractor');
    } catch (err) {
      console.error('Error requesting quote:', err);
      toast.error('Failed to request quote');
      throw err;
    }
  };

  const submitQuote = async (requestId: string, amount: number, description?: string) => {
    try {
      // Find the contractor ID for the current user
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
          contractor_id: contractorData.id, // Add the contractor_id
          amount,
          description,
          status: 'pending'
        });

      if (error) throw error;
      toast.success('Quote submitted successfully');
    } catch (err) {
      console.error('Error submitting quote:', err);
      toast.error('Failed to submit quote');
      throw err;
    }
  };

  const approveQuote = async (quoteId: string) => {
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      const updates = await supabase.from('quotes').update({
        status: 'approved',
        approved_at: new Date().toISOString()
      }).eq('id', quoteId);

      if (updates.error) throw updates.error;

      const requestUpdate = await supabase.from('maintenance_requests').update({
        contractor_id: quote.contractor_id,
        quoted_amount: quote.amount,
        status: 'in-progress',
        assigned_at: new Date().toISOString()
      }).eq('id', quote.request_id);

      if (requestUpdate.error) throw requestUpdate.error;

      toast.success('Quote approved and contractor assigned');
    } catch (err) {
      console.error('Error approving quote:', err);
      toast.error('Failed to approve quote');
      throw err;
    }
  };

  const updateJobProgress = async (requestId: string, progress: number, notes?: string) => {
    try {
      const updates: any = {
        completion_percentage: progress
      };

      if (notes) {
        const { data: currentRequest } = await supabase
          .from('maintenance_requests')
          .select('progress_notes')
          .eq('id', requestId)
          .single();

        updates.progress_notes = [
          ...(currentRequest?.progress_notes || []),
          notes
        ];
      }

      if (progress === 100) {
        updates.status = 'completed';
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;
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
