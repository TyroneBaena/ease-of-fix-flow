
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
  console.log('🔧 assignContractorToRequest - Starting assignment:', { requestId, contractorId });
  
  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({
      contractor_id: contractorId,
      assigned_at: new Date().toISOString(),
      status: 'in-progress'
    })
    .eq('id', requestId)
    .select(); // Add select to see what was updated

  console.log('🔧 assignContractorToRequest - Update result:', { data, error });

  if (error) {
    console.error('🔧 assignContractorToRequest - Update failed:', error);
    throw error;
  }

  // Verify the update worked
  const { data: verifyData } = await supabase
    .from('maintenance_requests')
    .select('id, status, contractor_id, assigned_at')
    .eq('id', requestId)
    .single();
    
  console.log('🔧 assignContractorToRequest - Post-update verification:', verifyData);
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

export const updateJobProgressStatus = async (
  requestId: string, 
  progress: number, 
  notes?: string
) => {
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
};

