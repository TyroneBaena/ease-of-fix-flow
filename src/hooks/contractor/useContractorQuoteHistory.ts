
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

interface QuoteLog {
  id: string;
  quoteId: string;
  action: 'created' | 'updated' | 'resubmitted';
  oldAmount?: number;
  newAmount: number;
  oldDescription?: string;
  newDescription?: string;
  createdAt: string;
}

export const useContractorQuoteHistory = (requestId: string | undefined) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteLogs, setQuoteLogs] = useState<QuoteLog[]>([]);
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

        // Map the quotes data to our interface
        const mappedQuotes: Quote[] = (quotesData || []).map(quote => ({
          id: quote.id,
          amount: quote.amount,
          description: quote.description || undefined,
          status: quote.status as 'requested' | 'pending' | 'approved' | 'rejected',
          submittedAt: quote.submitted_at,
          createdAt: quote.created_at
        }));

        // Fetch quote logs for all quotes
        if (quotesData && quotesData.length > 0) {
          const quoteIds = quotesData.map(q => q.id);
          const { data: logsData, error: logsError } = await supabase
            .from('quote_logs')
            .select('*')
            .in('quote_id', quoteIds)
            .order('created_at', { ascending: false });

          if (!logsError && logsData) {
            const mappedLogs: QuoteLog[] = logsData.map(log => ({
              id: log.id,
              quoteId: log.quote_id,
              action: log.action as 'created' | 'updated' | 'resubmitted',
              oldAmount: log.old_amount || undefined,
              newAmount: log.new_amount,
              oldDescription: log.old_description || undefined,
              newDescription: log.new_description || undefined,
              createdAt: log.created_at
            }));
            setQuoteLogs(mappedLogs);
          }
        }

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

        // Refresh quote logs as well
        if (quotesData.length > 0) {
          const quoteIds = quotesData.map(q => q.id);
          const { data: logsData, error: logsError } = await supabase
            .from('quote_logs')
            .select('*')
            .in('quote_id', quoteIds)
            .order('created_at', { ascending: false });

          if (!logsError && logsData) {
            const mappedLogs: QuoteLog[] = logsData.map(log => ({
              id: log.id,
              quoteId: log.quote_id,
              action: log.action as 'created' | 'updated' | 'resubmitted',
              oldAmount: log.old_amount || undefined,
              newAmount: log.new_amount,
              oldDescription: log.old_description || undefined,
              newDescription: log.new_description || undefined,
              createdAt: log.created_at
            }));
            setQuoteLogs(mappedLogs);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing quotes:', error);
    }
  };

  return {
    quotes,
    quoteLogs,
    loading,
    refreshQuotes
  };
};
