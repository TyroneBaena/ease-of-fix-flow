
import { useState, useEffect, useRef } from 'react';
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
  // v77.2: Track initial load to prevent loading flashes on tab revisits
  const hasCompletedInitialLoadRef = useRef(false);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    const fetchContractorQuotes = async () => {
      try {
        // v77.2: CRITICAL - NEVER set loading after initial load
        if (!hasCompletedInitialLoadRef.current) {
          setLoading(true);
        } else {
          console.log('🔕 v77.2 - ContractorQuoteHistory - SILENT REFRESH');
        }
        
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

        // Map the quotes data to our interface with proper timestamp handling
        const mappedQuotes: Quote[] = (quotesData || []).map(quote => ({
          id: quote.id,
          amount: quote.amount,
          description: quote.description || undefined,
          status: quote.status as 'requested' | 'pending' | 'approved' | 'rejected',
          submittedAt: quote.submitted_at || quote.created_at, // Use submitted_at, fallback to created_at
          createdAt: quote.created_at
        }));

        console.log('Raw quotes data from DB:', quotesData);
        console.log('Mapped quotes with timestamps:', mappedQuotes);

        // Fetch quote logs for all quotes
        if (quotesData && quotesData.length > 0) {
          const quoteIds = quotesData.map(q => q.id);
          const { data: logsData, error: logsError } = await supabase
            .from('quote_logs')
            .select('*')
            .in('quote_id', quoteIds)
            .order('created_at', { ascending: false });

          if (!logsError && logsData) {
            console.log('Raw logs data from DB:', logsData);
            
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
            
            console.log('Mapped logs with timestamps:', mappedLogs);
            setQuoteLogs(mappedLogs);
          }
        }

        setQuotes(mappedQuotes);
      } catch (error) {
        console.error('Error in fetchContractorQuotes:', error);
        toast.error('Error loading quote history');
      } finally {
        // v77.2: Mark initial load as complete
        if (!hasCompletedInitialLoadRef.current) {
          setLoading(false);
        }
        hasCompletedInitialLoadRef.current = true;
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
          submittedAt: quote.submitted_at || quote.created_at, // Use submitted_at, fallback to created_at
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
    // v77.2: Override loading after initial load completes
    loading: hasCompletedInitialLoadRef.current ? false : loading,
    refreshQuotes
  };
};
