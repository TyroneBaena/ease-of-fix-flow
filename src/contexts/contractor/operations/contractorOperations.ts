
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export const assignContractorToRequest = async (requestId: string, contractorId: string) => {
  // First, get the contractor's details to use their name
  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('company_name')
    .eq('id', contractorId)
    .single();

  if (contractorError) throw contractorError;
  
  const contractorName = contractor?.company_name || 'Unknown Contractor';

  // Update the maintenance request with both the ID and the name
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      contractor_id: contractorId,
      assigned_at: new Date().toISOString(),
      status: 'in-progress',
      assigned_to: contractorName // Store the contractor name for display
    })
    .eq('id', requestId);

  if (error) throw error;
  
  console.log(`Assigned contractor ${contractorName} (${contractorId}) to request ${requestId}`);
};

export const changeContractorAssignment = async (requestId: string, contractorId: string) => {
  // First, get the contractor's details to use their name
  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('company_name')
    .eq('id', contractorId)
    .single();

  if (contractorError) throw contractorError;
  
  const contractorName = contractor?.company_name || 'Unknown Contractor';

  // Get the current request to add to history
  const { data: currentRequest, error: requestError } = await supabase
    .from('maintenance_requests')
    .select('history, assigned_to')
    .eq('id', requestId)
    .single();

  if (requestError) throw requestError;

  // Prepare history update
  const previousContractor = currentRequest?.assigned_to || 'Unknown';
  const historyEntry = {
    action: `Contractor reassigned from ${previousContractor} to ${contractorName}`,
    timestamp: new Date().toISOString()
  };

  const history = [
    ...(currentRequest?.history || []),
    historyEntry
  ];

  // Update the maintenance request with the new contractor
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      contractor_id: contractorId,
      assigned_at: new Date().toISOString(),
      assigned_to: contractorName,
      history
    })
    .eq('id', requestId);

  if (error) throw error;
  
  console.log(`Reassigned contractor from ${previousContractor} to ${contractorName} (${contractorId}) for request ${requestId}`);
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
