
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Quote } from '@/types/contractor';
import { toast } from 'sonner';
import { retryableQuery } from '@/utils/retryLogic';

/**
 * Hook to fetch quotes for a specific maintenance request
 * Now with retry logic for transient failures
 */
export function useRequestQuotes(requestId: string | undefined, forceRefresh: number = 0) {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    if (!requestId) return;
    
    const fetchQuotes = async () => {
      // CRITICAL FIX: Add timeout protection with longer window for session restoration
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('Quotes fetch timeout after 30s');
      }, 30000); // 30 second timeout to allow for session restoration

      try {
        // Wrap with retry logic
        const result = await retryableQuery(
          async () => {
            return await supabase
              .from('quotes')
              .select('*')
              .eq('request_id', requestId)
              .order('created_at', { ascending: false });
          },
          {
            maxAttempts: 3,
            baseDelay: 2000,
            onRetry: (attempt) => {
              console.log(`🔄 Retrying quotes fetch (attempt ${attempt}/3)...`);
            }
          }
        );

        clearTimeout(timeoutId);
        
        const { data, error } = result;
          
        if (!error && data) {
          const mappedQuotes: Quote[] = data.map(quote => ({
            id: quote.id,
            requestId: quote.request_id,
            contractorId: quote.contractor_id,
            amount: quote.amount,
            description: quote.description || undefined,
            status: quote.status as 'requested' | 'pending' | 'approved' | 'rejected',
            submittedAt: quote.submitted_at,
            approvedAt: quote.approved_at || undefined,
            createdAt: quote.created_at,
            updatedAt: quote.updated_at
          }));
          
          console.log("useRequestQuotes - Fetched quotes:", mappedQuotes);
          setQuotes(mappedQuotes);
        } else if (error) {
          console.error("useRequestQuotes - Error fetching quotes:", error);
          toast.error("Failed to load quotes");
        }
      } catch (err) {
        clearTimeout(timeoutId);
        
        if (controller.signal.aborted) {
          console.warn('Quotes fetch aborted due to timeout');
          toast.error("Quotes loading timed out");
        } else {
          console.error("useRequestQuotes - Exception fetching quotes:", err);
          toast.error("Error loading quotes data");
        }
      }
    };
    
    fetchQuotes();
  }, [requestId, forceRefresh]);

  return quotes;
}
