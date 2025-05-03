
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

export const requestQuoteForJob = async (requestId: string, contractorId: string, includeInfo = {}, notes = '') => {
  // First mark the request as having quotes requested
  const { error: requestError } = await supabase
    .from('maintenance_requests')
    .update({
      quote_requested: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (requestError) throw requestError;

  // Then create a new record in the quotes table with status 'requested'
  const { error } = await supabase
    .from('quotes')
    .insert({
      request_id: requestId,
      contractor_id: contractorId,
      status: 'requested', // Initial status is 'requested', will be updated to 'pending' when submitted
      amount: 0, // Initial placeholder value
      submitted_at: new Date().toISOString(),
      description: notes || null
    });

  if (error) throw error;
  
  // In a real-world scenario, we might want to notify the contractor via email here
  console.log(`Quote requested for job ${requestId} from contractor ${contractorId}`);
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

export const updateJobProgressStatus = async (
  requestId: string, 
  progress: number, 
  notes?: string,
  completionPhotos?: Array<{ url: string }>
) => {
  const updates: any = {
    completion_percentage: progress,
    updated_at: new Date().toISOString()
  };

  if (notes) {
    const { data: currentRequest } = await supabase
      .from('maintenance_requests')
      .select('progress_notes')
      .eq('id', requestId)
      .single();

    // Fix the iteration issue by ensuring we have a valid array
    let existingNotes: string[] = [];
    if (currentRequest?.progress_notes && Array.isArray(currentRequest.progress_notes)) {
      existingNotes = currentRequest.progress_notes;
    }

    updates.progress_notes = [
      ...existingNotes,
      {
        note: notes,
        timestamp: new Date().toISOString()
      }
    ];
  }

  if (completionPhotos && completionPhotos.length > 0) {
    const { data: currentPhotos } = await supabase
      .from('maintenance_requests')
      .select('completion_photos')
      .eq('id', requestId)
      .single();
    
    // Ensure we have a valid array for completion_photos and format correctly
    let existingPhotos: Array<{ url: string }> = [];
    if (currentPhotos?.completion_photos) {
      // Make sure each item is properly formatted with a url property
      if (Array.isArray(currentPhotos.completion_photos)) {
        existingPhotos = currentPhotos.completion_photos.map(photo => {
          // If it's already an object with a url property, use it directly
          if (typeof photo === 'object' && photo !== null && 'url' in photo) {
            return photo as { url: string };
          }
          // If it's a string, assume it's the URL
          else if (typeof photo === 'string') {
            return { url: photo };
          }
          // For any other case, try to convert to string and use as URL
          else {
            return { url: String(photo) };
          }
        });
      }
    }
    
    updates.completion_photos = [
      ...existingPhotos,
      ...completionPhotos
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
