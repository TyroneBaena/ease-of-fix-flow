
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
  action: 'created' | 'updated' | 'resubmitted',
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
    
    // Create detailed message with property information
    let message = `You have a new quote request for maintenance job #${requestId.substring(0, 8)}`;
    
    if (propertyDetails) {
      message += `\n\nProperty: ${propertyDetails.name}`;
      message += `\nAddress: ${propertyDetails.address}`;
      message += `\nPractice Leader: ${propertyDetails.practiceLeader}`;
      if (propertyDetails.practiceLeaderPhone) {
        message += `\nPractice Leader Phone: ${propertyDetails.practiceLeaderPhone}`;
      }
      if (propertyDetails.practiceLeaderEmail) {
        message += `\nPractice Leader Email: ${propertyDetails.practiceLeaderEmail}`;
      }
      if (propertyDetails.contactNumber) {
        message += `\nSite Contact: ${propertyDetails.contactNumber}`;
      }
    }
    
    // Create notification in the database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        title: 'New Quote Request with Property Details',
        message: message,
        type: 'info',
        user_id: contractor.user_id,
        link: `/contractor/jobs/${requestId}`
      });
        
    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }
    
    console.log(`Notification with property details created for contractor ${contractor.company_name}`);
    return true;
  } catch (error) {
    console.error("Failed to create notification with property details:", error);
    return false;
  }
};

// Update the requestQuote function to properly persist data to the database and include property details
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
    // Fetch property details first
    const propertyDetails = await fetchPropertyDetails(requestId);
    console.log("Fetched property details:", propertyDetails);

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

    // Create enhanced notes that include property details if available
    let enhancedNotes = notes || 'Quote requested';
    if (propertyDetails && includeInfo.contactDetails) {
      enhancedNotes += `\n\nProperty Details:`;
      enhancedNotes += `\nProperty: ${propertyDetails.name}`;
      enhancedNotes += `\nAddress: ${propertyDetails.address}`;
      enhancedNotes += `\nPractice Leader: ${propertyDetails.practiceLeader}`;
      if (propertyDetails.practiceLeaderPhone) {
        enhancedNotes += `\nPractice Leader Phone: ${propertyDetails.practiceLeaderPhone}`;
      }
      if (propertyDetails.practiceLeaderEmail) {
        enhancedNotes += `\nPractice Leader Email: ${propertyDetails.practiceLeaderEmail}`;
      }
      if (propertyDetails.contactNumber) {
        enhancedNotes += `\nSite Contact: ${propertyDetails.contactNumber}`;
      }
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
        description: enhancedNotes
      });

    if (quoteError) {
      console.error("Error creating quote record:", quoteError);
      throw new Error(`Failed to create quote record: ${quoteError.message}`);
    }
    
    // Create notification with property details
    await createContractorNotificationWithPropertyDetails(contractorId, requestId, propertyDetails);
    
    console.log(`Quote successfully requested for job ${requestId} from contractor ${contractorId} with property details`);
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

// Re-export the function with an alias to match imports in other files
export { requestQuote as requestQuoteForJob };
