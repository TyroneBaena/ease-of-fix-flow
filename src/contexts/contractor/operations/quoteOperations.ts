
// Make sure this import exists at the top of the file
import { supabase } from '@/lib/supabase';

// Type definition for include info
export interface IncludeInfo {
  description: boolean;
  location: boolean;
  images: boolean;
  contactDetails: boolean;
  urgency: boolean;
}

// Update the requestQuote function to properly persist data to the database
export const requestQuote = async (
  requestId: string,
  contractorId: string,
  includeInfo: IncludeInfo,
  notes: string
) => {
  console.log(`Requesting quote for request ${requestId} from contractor ${contractorId}`);
  console.log("Include info:", includeInfo);
  console.log("Notes:", notes);

  // First mark the request as having quotes requested
  const { error: requestError } = await supabase
    .from('maintenance_requests')
    .update({
      quote_requested: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (requestError) {
    console.error("Error updating maintenance request:", requestError);
    throw requestError;
  }

  // Create a new record in the quotes table with status 'requested'
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

  if (error) {
    console.error("Error creating quote record:", error);
    throw error;
  }
  
  console.log(`Quote successfully requested for job ${requestId} from contractor ${contractorId}`);
  return true; // Return success indicator
};

// Re-export the function with an alias to match imports in other files
export { requestQuote as requestQuoteForJob };
