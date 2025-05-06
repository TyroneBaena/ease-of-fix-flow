
import { supabase } from '@/lib/supabase';

export const submitQuoteForJob = async (
  requestId: string, 
  amount: number, 
  description?: string
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

  // Find if there's an existing quote request
  const { data: existingQuote, error: findError } = await supabase
    .from('quotes')
    .select('id')
    .eq('request_id', requestId)
    .eq('contractor_id', contractorData.id)
    .eq('status', 'requested')
    .single();

  if (findError && findError.code !== 'PGRST116') { // Not found is okay
    throw findError;
  }

  if (existingQuote) {
    // Update the existing quote request
    const { error } = await supabase
      .from('quotes')
      .update({
        amount,
        description,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingQuote.id);

    if (error) throw error;
  } else {
    // Create a new quote
    const { error } = await supabase
      .from('quotes')
      .insert({
        request_id: requestId,
        contractor_id: contractorData.id,
        amount,
        description,
        status: 'pending',
        submitted_at: new Date().toISOString()
      });

    if (error) throw error;
  }
};

export const approveQuoteForJob = async (quoteId: string) => {
  // First get quote details
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quoteError) throw quoteError;

  // Get contractor details to store the name
  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('company_name')
    .eq('id', quote.contractor_id)
    .single();

  if (contractorError) throw contractorError;
  
  const contractorName = contractor?.company_name || 'Unknown Contractor';

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
      assigned_at: new Date().toISOString(),
      assigned_to: contractorName // Store contractor name for display
    })
    .eq('id', quote.request_id);

  // Decline all other quotes for this request
  const declineOtherQuotes = supabase
    .from('quotes')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('request_id', quote.request_id)
    .neq('id', quoteId);

  const [quoteUpdate, requestUpdate, declineUpdate] = await Promise.all([updateQuote, updateRequest, declineOtherQuotes]);

  if (quoteUpdate.error) throw quoteUpdate.error;
  if (requestUpdate.error) throw requestUpdate.error;
  if (declineUpdate.error) throw declineUpdate.error;
};

export const rejectQuote = async (quoteId: string) => {
  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', quoteId);

  if (error) throw error;
};
