
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Quote } from '@/types/contractor';
import { toast } from 'sonner';

/**
 * Hook to fetch quotes for a specific maintenance request
 */
export function useRequestQuotes(requestId: string | undefined, forceRefresh: number = 0) {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    if (!requestId) return;
    
    const fetchQuotes = async () => {
      try {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          // Map database fields to our interface fields
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
        console.error("useRequestQuotes - Exception fetching quotes:", err);
        toast.error("Error loading quotes data");
      }
    };
    
    fetchQuotes();
  }, [requestId, forceRefresh]);

  return quotes;
}
