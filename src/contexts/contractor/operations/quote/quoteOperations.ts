
import { supabase } from '@/lib/supabase';
import { IncludeInfo, PropertyDetails } from '../types/quoteTypes';
import { fetchPropertyDetails } from '../helpers/quoteHelpers';
import { createQuoteLog } from '../logging/quoteLogging';
import { 
  createContractorNotificationWithPropertyDetails, 
  notifyRejectedContractors,
  createAssignmentNotification 
} from '../notifications/quoteNotifications';

// Update the requestQuote function to automatically include full site details
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
    // Fetch property details first - this is now ALWAYS included automatically
    const propertyDetails = await fetchPropertyDetails(requestId);
    console.log("Fetched property details for automatic inclusion:", propertyDetails);

    // Check if a quote already exists for this contractor and request
    const { data: existingQuote, error: checkError } = await supabase
      .from('quotes')
      .select('id, status, description')
      .eq('request_id', requestId)
      .eq('contractor_id', contractorId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing quote:", checkError);
      throw new Error(`Failed to check existing quote: ${checkError.message}`);
    }

    // Create enhanced notes that AUTOMATICALLY include ALL site details
    let enhancedNotes = notes || 'Quote requested';
    
    // ALWAYS include property details regardless of includeInfo settings
    if (propertyDetails) {
      enhancedNotes += `\n\n=== SITE DETAILS (AUTOMATICALLY INCLUDED) ===`;
      enhancedNotes += `\nProperty Name: ${propertyDetails.name}`;
      enhancedNotes += `\nProperty Address: ${propertyDetails.address}`;
      enhancedNotes += `\nSite Phone Number: ${propertyDetails.contactNumber}`;
      enhancedNotes += `\nPractice Leader: ${propertyDetails.practiceLeader}`;
      if (propertyDetails.practiceLeaderPhone) {
        enhancedNotes += `\nPractice Leader Phone: ${propertyDetails.practiceLeaderPhone}`;
      }
      if (propertyDetails.practiceLeaderEmail) {
        enhancedNotes += `\nPractice Leader Email: ${propertyDetails.practiceLeaderEmail}`;
      }
      enhancedNotes += `\n===========================================`;
    }

    if (existingQuote) {
      // Update the existing quote instead of creating a new one
      console.log(`Updating existing quote ${existingQuote.id} for contractor ${contractorId} with full site details`);
      
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'requested',
          description: enhancedNotes,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingQuote.id);

      if (updateError) {
        console.error("Error updating existing quote:", updateError);
        throw new Error(`Failed to update existing quote: ${updateError.message}`);
      }

      // Create quote log for the re-request
      await createQuoteLog(
        existingQuote.id,
        contractorId,
        'quote_requested',
        undefined,
        1, // Keep the placeholder amount
        existingQuote.description,
        enhancedNotes
      );

      console.log(`Quote successfully re-requested for job ${requestId} from contractor ${contractorId} with full site details`);
    } else {
      // Create a new quote record if none exists
      console.log(`Creating new quote for contractor ${contractorId} with full site details`);
      
      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          request_id: requestId,
          contractor_id: contractorId,
          status: 'requested',
          amount: 1, // Placeholder amount
          submitted_at: new Date().toISOString(),
          description: enhancedNotes
        })
        .select('id')
        .single();

      if (quoteError) {
        console.error("Error creating quote record:", quoteError);
        throw new Error(`Failed to create quote record: ${quoteError.message}`);
      }

      // Create quote log for the new quote request
      if (newQuote) {
        await createQuoteLog(
          newQuote.id,
          contractorId,
          'quote_requested',
          undefined,
          1,
          undefined,
          enhancedNotes
        );
      }

      console.log(`Quote successfully requested for job ${requestId} from contractor ${contractorId} with full site details`);
    }

    // Mark the request as having quotes requested (only if not already marked)
    const { error: requestError } = await supabase
      .from('maintenance_requests')
      .update({
        quote_requested: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (requestError) {
      console.error("Error updating maintenance request:", requestError);
      // Don't throw here as the main operation succeeded
    }
    
    // Create notification with full site details
    await createContractorNotificationWithPropertyDetails(contractorId, requestId, propertyDetails);
    
    return true; // Return success indicator
  } catch (error) {
    console.error("Error in requestQuote:", error);
    throw error;
  }
};

// Add the submitQuoteForJob function here with logging
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
      .select('id, status, amount, description')
      .eq('request_id', requestId)
      .eq('contractor_id', contractorData.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing quote: ${checkError.message}`);
    }

    if (existingQuote) {
      // Store old values for logging
      const oldAmount = existingQuote.amount;
      const oldDescription = existingQuote.description;
      const isResubmission = existingQuote.status === 'pending' || existingQuote.status === 'rejected';
      
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

      // Create quote log for the update/resubmission
      const action = isResubmission ? 'resubmitted' : 'updated';
      await createQuoteLog(
        existingQuote.id,
        contractorData.id,
        action,
        oldAmount,
        amount,
        oldDescription,
        description
      );
    } else {
      // Create a new quote if none exists
      const { data: newQuote, error: insertError } = await supabase
        .from('quotes')
        .insert({
          request_id: requestId,
          contractor_id: contractorData.id,
          amount,
          description,
          status: 'pending'
        })
        .select('id')
        .single();

      if (insertError) throw new Error(`Failed to submit quote: ${insertError.message}`);

      // Create quote log for the new quote
      if (newQuote) {
        await createQuoteLog(
          newQuote.id,
          contractorData.id,
          'created',
          undefined,
          amount,
          undefined,
          description
        );
      }
    }
    
    console.log("Quote submitted successfully");
    return true;
  } catch (error) {
    console.error("Error in submitQuoteForJob:", error);
    throw error;
  }
};

// Enhanced approveQuoteForJob function with assignment confirmation
export const approveQuoteForJob = async (quoteId: string) => {
  try {
    console.log(`Approving quote ${quoteId} and handling assignment confirmation`);
    
    // Get the quote details first
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError) {
      console.error('Error fetching quote:', quoteError);
      throw new Error(`Failed to fetch quote: ${quoteError.message}`);
    }

    if (!quote) {
      throw new Error('Quote not found');
    }

    // Fetch property details for notifications
    const propertyDetails = await fetchPropertyDetails(quote.request_id);

    // Get all other pending quotes for the same request (excluding the approved one)
    const { data: otherQuotes, error: otherQuotesError } = await supabase
      .from('quotes')
      .select('id, contractor_id')
      .eq('request_id', quote.request_id)
      .eq('status', 'pending')
      .neq('id', quoteId);

    if (otherQuotesError) {
      console.error('Error fetching other quotes:', otherQuotesError);
      throw new Error(`Failed to fetch other quotes: ${otherQuotesError.message}`);
    }

    // Approve the selected quote
    const { error: approveError } = await supabase
      .from('quotes')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', quoteId);

    if (approveError) {
      console.error('Error approving quote:', approveError);
      throw new Error(`Failed to approve quote: ${approveError.message}`);
    }

    // Reject all other pending quotes for this request
    if (otherQuotes && otherQuotes.length > 0) {
      console.log(`Rejecting ${otherQuotes.length} other pending quotes`);
      
      const { error: rejectError } = await supabase
        .from('quotes')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .in('id', otherQuotes.map(q => q.id));

      if (rejectError) {
        console.error('Error rejecting other quotes:', rejectError);
        // Don't throw here - the main approval succeeded
      } else {
        // Create quote logs for rejected quotes
        for (const rejectedQuote of otherQuotes) {
          await createQuoteLog(
            rejectedQuote.id,
            rejectedQuote.contractor_id,
            'rejected'
          );
        }
        // Notify rejected contractors
        await notifyRejectedContractors(otherQuotes, quote.request_id, propertyDetails);
      }
    }

    // Update the maintenance request with assignment details
    const { error: updateRequestError } = await supabase
      .from('maintenance_requests')
      .update({
        contractor_id: quote.contractor_id,
        quoted_amount: quote.amount,
        status: 'in-progress',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quote.request_id);

    if (updateRequestError) {
      console.error('Error updating maintenance request:', updateRequestError);
      throw new Error(`Failed to update maintenance request: ${updateRequestError.message}`);
    }

    // Create assignment notification for the approved contractor
    await createAssignmentNotification(quote.contractor_id, quote.request_id, propertyDetails);

    console.log(`Quote ${quoteId} approved successfully with assignment confirmation`);
    return true;
  } catch (error) {
    console.error('Error in approveQuoteForJob:', error);
    throw error;
  }
};

// Re-export the function with an alias to match imports in other files
export { requestQuote as requestQuoteForJob };
