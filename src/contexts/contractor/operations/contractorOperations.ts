
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

// Remove the fetchContractors function - it's now in contractorFetch.ts

// Helper function to create notification with property details for assignment
const createAssignmentNotificationWithPropertyDetails = async (
  contractorId: string,
  requestId: string
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
      return false;
    }
    
    if (!contractor?.user_id) {
      console.error("Missing user_id for contractor:", contractorId);
      return false;
    }

    // Fetch property details for the maintenance request
    const { data: request, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('property_id, site, title, description')
      .eq('id', requestId)
      .single();

    if (requestError || !request?.property_id) {
      console.log('No property_id found for request:', requestId);
      // Create basic notification without property details
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Job Assignment',
          message: `You have been assigned to maintenance job #${requestId.substring(0, 8)}`,
          type: 'info',
          user_id: contractor.user_id,
          link: `/contractor/jobs/${requestId}`
        });
      
      return !notificationError;
    }

    // Fetch property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('address, practice_leader, practice_leader_email, practice_leader_phone, contact_number, name')
      .eq('id', request.property_id)
      .single();

    // Create detailed message with property information
    let message = `You have been assigned to maintenance job #${requestId.substring(0, 8)}`;
    
    if (!propertyError && property) {
      message += `\n\nProperty: ${property.name || ''}`;
      message += `\nAddress: ${property.address || ''}`;
      message += `\nPractice Leader: ${property.practice_leader || ''}`;
      if (property.practice_leader_phone) {
        message += `\nPractice Leader Phone: ${property.practice_leader_phone}`;
      }
      if (property.practice_leader_email) {
        message += `\nPractice Leader Email: ${property.practice_leader_email}`;
      }
      if (property.contact_number) {
        message += `\nSite Contact: ${property.contact_number}`;
      }
    }
    
    // Create notification in the database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        title: 'Job Assignment with Property Details',
        message: message,
        type: 'info',
        user_id: contractor.user_id,
        link: `/contractor/jobs/${requestId}`
      });
        
    if (notificationError) {
      console.error("Error creating assignment notification:", notificationError);
      return false;
    }
    
    console.log(`Assignment notification with property details created for contractor ${contractor.company_name}`);
    return true;
  } catch (error) {
    console.error("Failed to create assignment notification with property details:", error);
    return false;
  }
};

export const assignContractorToRequest = async (requestId: string, contractorId: string) => {
  console.log(`SECURITY: Assigning contractor ${contractorId} to request ${requestId}`);
  
  // SECURITY FIX: Validate organization boundaries before assignment
  // First verify the contractor exists and is in the same organization as the request
  const { data: validation, error: validationError } = await supabase
    .from('maintenance_requests')
    .select(`
      id,
      organization_id,
      contractors!inner(id, organization_id, company_name)
    `)
    .eq('id', requestId)
    .eq('contractors.id', contractorId)
    .single();

  if (validationError || !validation) {
    console.error("SECURITY VIOLATION: Contractor assignment validation failed:", validationError);
    throw new Error("Cannot assign contractor: Invalid contractor selection or organization mismatch");
  }

  console.log("SECURITY: Organization boundary validation passed");

  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      contractor_id: contractorId,
      assigned_at: new Date().toISOString(),
      status: 'in-progress'
    })
    .eq('id', requestId);

  if (error) {
    console.error("Error during contractor assignment:", error);
    throw error;
  }

  console.log("SECURITY: Contractor assignment completed successfully");
  // Create notification with property details for the assigned contractor
  await createAssignmentNotificationWithPropertyDetails(contractorId, requestId);
};

export const changeContractorAssignment = async (requestId: string, contractorId: string) => {
  const result = await assignContractorToRequest(requestId, contractorId);
  // The notification is already handled in assignContractorToRequest
  return result;
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

// Use the enhanced approveQuoteForJob from quoteOperations.ts
export { approveQuoteForJob } from './quoteOperations';
