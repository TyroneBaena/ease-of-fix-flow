
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Quote {
  id: string;
  amount: number;
  description?: string;
  status: 'requested' | 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt: string;
}

export const useContractorQuoteHistory = (requestId: string | undefined) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    const fetchContractorQuotes = async () => {
      try {
        setLoading(true);
        
        // First get the contractor ID for the current user
        const { data: contractorData, error: contractorError } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (contractorError) {
          console.error('Error fetching contractor:', contractorError);
          setLoading(false);
          return;
        }

        if (!contractorData?.id) {
          console.log('No contractor found for current user');
          setLoading(false);
          return;
        }

        // Fetch quotes for this contractor and request
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('*')
          .eq('request_id', requestId)
          .eq('contractor_id', contractorData.id)
          .order('created_at', { ascending: false });

        if (quotesError) {
          console.error('Error fetching quotes:', quotesError);
          toast.error('Failed to load quote history');
          setLoading(false);
          return;
        }

        // Map the data to our interface
        const mappedQuotes: Quote[] = (quotesData || []).map(quote => ({
          id: quote.id,
          amount: quote.amount,
          description: quote.description || undefined,
          status: quote.status as 'requested' | 'pending' | 'approved' | 'rejected',
          submittedAt: quote.submitted_at,
          createdAt: quote.created_at
        }));

        console.log('Fetched contractor quotes:', mappedQuotes);
        setQuotes(mappedQuotes);
      } catch (error) {
        console.error('Error in fetchContractorQuotes:', error);
        toast.error('Error loading quote history');
      } finally {
        setLoading(false);
      }
    };

    fetchContractorQuotes();
  }, [requestId]);

  const refreshQuotes = async () => {
    if (!requestId) return;
    
    try {
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (contractorError || !contractorData?.id) return;

      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('request_id', requestId)
        .eq('contractor_id', contractorData.id)
        .order('created_at', { ascending: false });

      if (!quotesError && quotesData) {
        const mappedQuotes: Quote[] = quotesData.map(quote => ({
          id: quote.id,
          amount: quote.amount,
          description: quote.description || undefined,
          status: quote.status as 'requested' | 'pending' | 'approved' | 'rejected',
          submittedAt: quote.submitted_at,
          createdAt: quote.created_at
        }));
        
        setQuotes(mappedQuotes);
      }
    } catch (error) {
      console.error('Error refreshing quotes:', error);
    }
  };

  return {
    quotes,
    loading,
    refreshQuotes
  };
};
