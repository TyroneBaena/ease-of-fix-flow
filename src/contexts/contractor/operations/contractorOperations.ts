
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export const assignContractorToRequest = async (requestId: string, contractorId: string) => {
  console.log(`Assigning contractor ${contractorId} to request ${requestId}`);
  
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
  console.log(`Starting contractor reassignment for request ${requestId} to contractor ${contractorId}`);
  
  // First, check if the contractor is already assigned to this request to prevent unnecessary updates
  const { data: currentRequest, error: currentRequestError } = await supabase
    .from('maintenance_requests')
    .select('contractor_id, assigned_to, history')
    .eq('id', requestId)
    .single();

  if (currentRequestError) throw currentRequestError;
  
  // If we're assigning the same contractor, just return without making changes
  if (currentRequest?.contractor_id === contractorId) {
    console.log(`Contractor ${contractorId} is already assigned to request ${requestId}, skipping update`);
    return;
  }

  // Get the contractor's details to use their name
  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('company_name')
    .eq('id', contractorId)
    .single();

  if (contractorError) throw contractorError;
  
  const contractorName = contractor?.company_name || 'Unknown Contractor';

  // Prepare history update
  const previousContractor = currentRequest?.assigned_to || 'Unknown';
  const historyEntry = {
    action: `Contractor reassigned from ${previousContractor} to ${contractorName}`,
    timestamp: new Date().toISOString()
  };

  // Ensure history is a valid array
  let existingHistory = [];
  if (currentRequest?.history && Array.isArray(currentRequest.history)) {
    existingHistory = currentRequest.history;
  }

  const history = [
    ...existingHistory,
    historyEntry
  ];

  // Define the update object with proper TypeScript type
  const updateData: {
    contractor_id: string;
    assigned_at: string;
    assigned_to: string;
    history: Array<{ action: string; timestamp: string }>;
  } = {
    contractor_id: contractorId,
    assigned_at: new Date().toISOString(),
    assigned_to: contractorName,
    history
  };

  // Update the maintenance request with the new contractor
  const { error } = await supabase
    .from('maintenance_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) throw error;
  
  console.log(`Successfully reassigned contractor from ${previousContractor} to ${contractorName} for request ${requestId}`);
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
  
  console.log(`Quote successfully requested for job ${requestId} from contractor ${contractorId}`);
};
