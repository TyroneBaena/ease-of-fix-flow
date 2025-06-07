
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
    // Use a minimal amount (1) as placeholder since the actual quote will be submitted later
    const { error: quoteError } = await supabase
      .from('quotes')
      .insert({
        request_id: requestId,
        contractor_id: contractorId,
        status: 'requested', // Initial status is 'requested', will be updated to 'pending' when submitted
        amount: 1, // Placeholder amount - actual quote will be submitted later
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

    // Check if a quote request already exists for this contractor and request
    const { data: existingQuote, error: checkError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('request_id', requestId)
      .eq('contractor_id', contractorData.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing quote: ${checkError.message}`);
    }

    if (existingQuote) {
      // Update the existing quote with the actual amount and description
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          amount,
          description,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingQuote.id);

      if (updateError) throw new Error(`Failed to update quote: ${updateError.message}`);
    } else {
      // Create a new quote if none exists
      const { error: insertError } = await supabase
        .from('quotes')
        .insert({
          request_id: requestId,
          contractor_id: contractorData.id,
          amount,
          description,
          status: 'pending'
        });

      if (insertError) throw new Error(`Failed to submit quote: ${insertError.message}`);
    }
    
    console.log("Quote submitted successfully");
    return true;
  } catch (error) {
    console.error("Error in submitQuoteForJob:", error);
    throw error;
  }
};

// Re-export the function with an alias to match imports in other files
export { requestQuote as requestQuoteForJob };
