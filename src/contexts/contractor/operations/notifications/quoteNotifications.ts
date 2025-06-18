
import { supabase } from '@/lib/supabase';
import { PropertyDetails } from '../types/quoteTypes';

// Helper function to create notification with property details for contractor
export const createContractorNotificationWithPropertyDetails = async (
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
export const notifyRejectedContractors = async (
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
    } catch (error) {
      console.error(`Failed to notify contractor ${quote.contractor_id}:`, error);
    }
  }
};

// Helper function to create assignment notification for approved contractor
export const createAssignmentNotification = async (
  contractorId: string,
  requestId: string,
  propertyDetails: PropertyDetails | null
) => {
  // Get contractor details
  const { data: approvedContractor, error: contractorError } = await supabase
    .from('contractors')
    .select('user_id, company_name')
    .eq('id', contractorId)
    .single();
  
  if (!contractorError && approvedContractor?.user_id) {
    let assignmentMessage = `Congratulations! Your quote for maintenance job #${requestId.substring(0, 8)} has been approved and you have been assigned to this job.`;
    
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
        link: `/contractor/jobs/${requestId}`
      });
      
    if (assignmentNotificationError) {
      console.error('Error creating assignment notification:', assignmentNotificationError);
    } else {
      console.log(`Assignment notification with site details created for contractor ${approvedContractor.company_name}`);
    }
  }
};
