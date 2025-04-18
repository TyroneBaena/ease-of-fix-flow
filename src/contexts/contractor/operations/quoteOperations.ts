
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export const requestQuoteForJob = async (requestId: string, contractorId: string) => {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      quote_requested: true
    })
    .eq('id', requestId);

  if (error) throw error;
};

export const submitQuoteForJob = async (requestId: string, amount: number, description?: string) => {
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
      contractor_id: contractorData.id,
      amount,
      description,
      status: 'pending'
    });

  if (error) throw error;
};

export const approveQuoteForJob = async (quoteId: string) => {
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quoteError) throw quoteError;

  const updateQuote = supabase
    .from('quotes')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', quoteId);

  const updateRequest = supabase
    .from('maintenance_requests')
    .update({
      contractor_id: quote.contractor_id,
      quoted_amount: quote.amount,
      status: 'in-progress',
      assigned_at: new Date().toISOString()
    })
    .eq('id', quote.request_id);

  const [quoteUpdate, requestUpdate] = await Promise.all([updateQuote, updateRequest]);

  if (quoteUpdate.error) throw quoteUpdate.error;
  if (requestUpdate.error) throw requestUpdate.error;
};
