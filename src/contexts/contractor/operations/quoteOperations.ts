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

// Interface for property details
export interface PropertyDetails {
  address: string;
  practiceLeader: string;
  practiceLeaderEmail: string;
  practiceLeaderPhone: string;
  contactNumber: string;
  name: string;
}

// Helper function to fetch property details for a maintenance request
const fetchPropertyDetails = async (requestId: string): Promise<PropertyDetails | null> => {
  try {
    // First get the maintenance request to find the property_id
    const { data: request, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('property_id, site')
      .eq('id', requestId)
      .single();

    if (requestError || !request?.property_id) {
      console.log('No property_id found for request:', requestId);
      return null;
    }

    // Then fetch the property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('address, practice_leader, practice_leader_email, practice_leader_phone, contact_number, name')
      .eq('id', request.property_id)
      .single();

    if (propertyError) {
      console.error('Error fetching property details:', propertyError);
      return null;
    }

    return {
      address: property.address || '',
      practiceLeader: property.practice_leader || '',
      practiceLeaderEmail: property.practice_leader_email || '',
      practiceLeaderPhone: property.practice_leader_phone || '',
      contactNumber: property.contact_number || '',
      name: property.name || ''
    };
  } catch (error) {
    console.error('Error in fetchPropertyDetails:', error);
    return null;
  }
};

// Helper function to create quote logs
const createQuoteLog = async (
  quoteId: string,
  contractorId: string,
  action: 'created' | 'updated' | 'resubmitted' | 'quote_requested' | 'rejected',
  oldAmount?: number,
  newAmount?: number,
  oldDescription?: string,
  newDescription?: string
) => {
  const { error } = await supabase
    .from('quote_logs')
    .insert({
      quote_id: quoteId,
      contractor_id: contractorId,
      action,
      old_amount: oldAmount,
      new_amount: newAmount,
      old_description: oldDescription,
      new_description: newDescription
    });

  if (error) {
    console.error('Error creating quote log:', error);
    // Don't throw here - logging failure shouldn't fail the main operation
  }
};

// Helper function to create notification with property details for contractor
const createContractorNotificationWithPropertyDetails = async (
  contractorId: string,
  requestId: string,
  propertyDetails: PropertyDetails | null
) => {
  try {
    // Get contractor details
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('user_id, company_name')
      .eq('id', contractorId)
      .single();
    
    if (contractorError) {
      console.error("Error fetching contractor:", contractorError);
      throw new Error(`Failed to fetch contractor: ${contractorError.message}`);
    }
    
    if (!contractor?.user_id) {
      console.error("Missing user_id for contractor:", contractorId);
      throw new Error("Contractor user_id not found");
    }
    
    // Create detailed message with ALL property information automatically included
    let message = `You have a new quote request for maintenance job #${requestId.substring(0, 8)}`;
    
    if (propertyDetails) {
      message += `\n\n--- SITE DETAILS ---`;
      message += `\nProperty: ${propertyDetails.name}`;
      message += `\nAddress: ${propertyDetails.address}`;
      message += `\nSite Phone: ${propertyDetails.contactNumber}`;
      message += `\nPractice Leader: ${propertyDetails.practiceLeader}`;
      if (propertyDetails.practiceLeaderPhone) {
        message += `\nPractice Leader Phone: ${propertyDetails.practiceLeaderPhone}`;
      }
      if (propertyDetails.practiceLeaderEmail) {
        message += `\nPractice Leader Email: ${propertyDetails.practiceLeaderEmail}`;
      }
    }
    
    // Create notification in the database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        title: 'New Quote Request - Site Details Included',
        message: message,
        type: 'info',
        user_id: contractor.user_id,
        link: `/contractor/jobs/${requestId}`
      });
        
    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }
    
    console.log(`Notification with full site details created for contractor ${contractor.company_name}`);
    return true;
  } catch (error) {
    console.error("Failed to create notification with property details:", error);
    return false;
  }
};

// Helper function to notify contractors when their quotes are rejected
const notifyRejectedContractors = async (
  rejectedQuotes: Array<{ id: string; contractor_id: string }>,
  requestId: string,
  propertyDetails: PropertyDetails | null
) => {
  console.log(`Notifying ${rejectedQuotes.length} contractors that their quotes were not accepted`);
  
  for (const quote of rejectedQuotes) {
    try {
      // Get contractor details
      const { data: contractor, error: contractorError } = await supabase
        .from('contractors')
        .select('user_id, company_name')
        .eq('id', quote.contractor_id)
        .single();
      
      if (contractorError || !contractor?.user_id) {
        console.error(`Error fetching contractor ${quote.contractor_id}:`, contractorError);
        continue;
      }
      
      // Create rejection notification message
      let message = `Your quote for maintenance job #${requestId.substring(0, 8)} was not accepted. Thank you for your interest.`;
      
      if (propertyDetails) {
        message += `\n\nProperty: ${propertyDetails.name}`;
        message += `\nAddress: ${propertyDetails.address}`;
      }
      
      // Create notification in the database
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Quote Not Accepted',
          message: message,
          type: 'info',
          user_id: contractor.user_id,
          link: `/contractor/jobs/${requestId}`
        });
          
      if (notificationError) {
        console.error(`Error creating rejection notification for contractor ${contractor.company_name}:`, notificationError);
      } else {
        console.log(`Rejection notification created for contractor ${contractor.company_name}`);
      }
      
      // Create quote log for rejection
      await createQuoteLog(
        quote.id,
        quote.contractor_id,
        'rejected'
      );
    } catch (error) {
      console.error(`Failed to notify contractor ${quote.contractor_id}:`, error);
    }
  }
};

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
    const { data: approvedContractor, error: contractorError } = await supabase
      .from('contractors')
      .select('user_id, company_name')
      .eq('id', quote.contractor_id)
      .single();
    
    if (!contractorError && approvedContractor?.user_id) {
      let assignmentMessage = `Congratulations! Your quote for maintenance job #${quote.request_id.substring(0, 8)} has been approved and you have been assigned to this job.`;
      
      if (propertyDetails) {
        assignmentMessage += `\n\n--- SITE DETAILS ---`;
        assignmentMessage += `\nProperty: ${propertyDetails.name}`;
        assignmentMessage += `\nAddress: ${propertyDetails.address}`;
        assignmentMessage += `\nSite Phone: ${propertyDetails.contactNumber}`;
        assignmentMessage += `\nPractice Leader: ${propertyDetails.practiceLeader}`;
        if (propertyDetails.practiceLeaderPhone) {
          assignmentMessage += `\nPractice Leader Phone: ${propertyDetails.practiceLeaderPhone}`;
        }
        if (propertyDetails.practiceLeaderEmail) {
          assignmentMessage += `\nPractice Leader Email: ${propertyDetails.practiceLeaderEmail}`;
        }
      }
      
      const { error: assignmentNotificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Quote Approved - Job Assigned with Site Details',
          message: assignmentMessage,
          type: 'success',
          user_id: approvedContractor.user_id,
          link: `/contractor/jobs/${quote.request_id}`
        });
        
      if (assignmentNotificationError) {
        console.error('Error creating assignment notification:', assignmentNotificationError);
      } else {
        console.log(`Assignment notification with site details created for contractor ${approvedContractor.company_name}`);
      }
    }

    console.log(`Quote ${quoteId} approved successfully with assignment confirmation`);
    return true;
  } catch (error) {
    console.error('Error in approveQuoteForJob:', error);
    throw error;
  }
};

// Re-export the function with an alias to match imports in other files
export { requestQuote as requestQuoteForJob };
