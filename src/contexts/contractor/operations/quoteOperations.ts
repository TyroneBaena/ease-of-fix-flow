
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

  try {
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
      throw new Error(`Failed to update maintenance request: ${requestError.message}`);
    }

    // Create a new record in the quotes table with status 'requested'
    // Don't set amount to 0, leave it null until contractor submits actual quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .insert({
        request_id: requestId,
        contractor_id: contractorId,
        status: 'requested', // Initial status is 'requested', will be updated to 'pending' when submitted
        amount: 1, // Set to 1 as placeholder since amount cannot be 0
        submitted_at: new Date().toISOString(),
        description: notes || 'Quote requested'
      });

    if (quoteError) {
      console.error("Error creating quote record:", quoteError);
      throw new Error(`Failed to create quote record: ${quoteError.message}`);
    }
    
    console.log(`Quote successfully requested for job ${requestId} from contractor ${contractorId}`);
    return true; // Return success indicator
  } catch (error) {
    console.error("Error in requestQuote:", error);
    throw error;
  }
};

// Add the submitQuoteForJob function here
export const submitQuoteForJob = async (
  requestId: string, 
  amount: number, 
  description: string
) => {
  try {
    const { data: contractorData, error: contractorError } = await supabase
      .from('contractors')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (contractorError) throw new Error(`Failed to get contractor data: ${contractorError.message}`);
    
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

    if (error) throw new Error(`Failed to submit quote: ${error.message}`);
    
    console.log("Quote submitted successfully");
    return true;
  } catch (error) {
    console.error("Error in submitQuoteForJob:", error);
    throw error;
  }
};

// Re-export the function with an alias to match imports in other files
export { requestQuote as requestQuoteForJob };
