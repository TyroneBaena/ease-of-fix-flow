
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const fetchContractors = async (): Promise<Contractor[]> => {
  const { data, error } = await supabase
    .from('contractors')
    .select('*');

  if (error) throw error;

  // Map the snake_case database fields to camelCase for our TypeScript interfaces
  return data.map(item => ({
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
};

export const assignContractorToRequest = async (requestId: string, contractorId: string) => {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      contractor_id: contractorId,
      assigned_at: new Date().toISOString(),
      status: 'in-progress'
    })
    .eq('id', requestId);

  if (error) throw error;
};

export const changeContractorAssignment = async (requestId: string, contractorId: string) => {
  return assignContractorToRequest(requestId, contractorId);
};

export const requestQuoteForJob = async (requestId: string, contractorId: string) => {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      quote_requested: true
    })
    .eq('id', requestId);

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
