// import { supabase } from '@/integrations/supabase/client';
// import { toast } from '@/lib/toast';
// import { Contractor } from '@/types/contractor';
// import { validateAndRepairContractorProfile, validateOrganizationConsistency } from '@/utils/contractorValidation';

// // Remove the fetchContractors function - it's now in contractorFetch.ts

// // Enhanced helper function with comprehensive validation and auto-repair
// const createAssignmentNotificationWithPropertyDetails = async (
//   contractorId: string,
//   requestId: string
// ) => {
//   try {
//     console.log(`Creating assignment notification for contractor ${contractorId}, request ${requestId}`);

//     // Validate and auto-repair contractor profile before creating notification
//     const validation = await validateAndRepairContractorProfile(contractorId);

//     if (!validation.isValid) {
//       console.error("Contractor validation failed:", validation.issues);
//       throw new Error(`Contractor validation failed: ${validation.issues.join(', ')}`);
//     }

//     if (validation.wasRepaired) {
//       console.log(`Auto-repaired contractor profile for ${validation.contractor?.company_name}`);
//     }

//     const contractor = validation.contractor!;

//     // Fetch property details for the maintenance request
//     const { data: request, error: requestError } = await supabase
//       .from('maintenance_requests')
//       .select('property_id, site, title, description')
//       .eq('id', requestId)
//       .single();

//     if (requestError || !request?.property_id) {
//       console.log('No property_id found for request:', requestId);
//       // Get request organization for notification
//       const { data: requestData } = await supabase
//         .from('maintenance_requests')
//         .select('organization_id')
//         .eq('id', requestId)
//         .single();

//       // Create basic notification without property details
//       const { error: notificationError } = await supabase
//         .from('notifications')
//         .insert({
//           title: 'Job Assignment',
//           message: `You have been assigned to maintenance job #${requestId.substring(0, 8)}`,
//           type: 'info',
//           user_id: contractor.user_id,
//           link: `/contractor/jobs/${requestId}`,
//           organization_id: requestData?.organization_id
//         });

//       return !notificationError;
//     }

//     // Fetch property details
//     const { data: property, error: propertyError } = await supabase
//       .from('properties')
//       .select('address, practice_leader, practice_leader_email, practice_leader_phone, contact_number, name')
//       .eq('id', request.property_id)
//       .single();

//     // Create detailed message with property information
//     let message = `You have been assigned to maintenance job #${requestId.substring(0, 8)}`;

//     if (!propertyError && property) {
//       message += `\n\nProperty: ${property.name || ''}`;
//       message += `\nAddress: ${property.address || ''}`;
//       message += `\nPractice Leader: ${property.practice_leader || ''}`;
//       if (property.practice_leader_phone) {
//         message += `\nPractice Leader Phone: ${property.practice_leader_phone}`;
//       }
//       if (property.practice_leader_email) {
//         message += `\nPractice Leader Email: ${property.practice_leader_email}`;
//       }
//       if (property.contact_number) {
//         message += `\nSite Contact: ${property.contact_number}`;
//       }
//     }

//     // Get request organization for notification
//     const { data: requestData } = await supabase
//       .from('maintenance_requests')
//       .select('organization_id')
//       .eq('id', requestId)
//       .single();

//     // Create notification in the database
//     const { error: notificationError } = await supabase
//       .from('notifications')
//       .insert({
//         title: 'Job Assignment with Property Details',
//         message: message,
//         type: 'info',
//         user_id: contractor.user_id,
//         link: `/contractor/jobs/${requestId}`,
//         organization_id: requestData?.organization_id
//       });

//     if (notificationError) {
//       console.error("Error creating assignment notification:", notificationError);
//       return false;
//     }

//     console.log(`Assignment notification with property details created for contractor ${contractor.company_name}`);
//     return true;
//   } catch (error) {
//     console.error("Failed to create assignment notification with property details:", error);
//     return false;
//   }
// };

// export const assignContractorToRequest = async (requestId: string, contractorId: string) => {
//   console.log(`=== STARTING CONTRACTOR ASSIGNMENT ===`);
//   console.log(`Assigning contractor ${contractorId} to request ${requestId}`);

//   try {
//     // STEP 1: Validate organization consistency
//     const orgValidation = await validateOrganizationConsistency(requestId, contractorId);

//     if (!orgValidation.isValid) {
//       console.error("SECURITY VIOLATION:", orgValidation.error);
//       throw new Error(`Assignment failed: ${orgValidation.error}`);
//     }

//     console.log("✅ Organization validation passed");

//     // STEP 2: Validate and auto-repair contractor profile
//     const contractorValidation = await validateAndRepairContractorProfile(contractorId);

//     if (!contractorValidation.isValid) {
//       console.error("Contractor profile validation failed:", contractorValidation.issues);
//       throw new Error(`Contractor validation failed: ${contractorValidation.issues.join(', ')}`);
//     }

//     if (contractorValidation.wasRepaired) {
//       console.log(`✅ Auto-repaired contractor profile for ${contractorValidation.contractor?.company_name}`);
//     } else {
//       console.log("✅ Contractor profile validation passed");
//     }

//     // STEP 3: Get the request organization for quote creation
//     const { data: requestData } = await supabase
//       .from('maintenance_requests')
//       .select('organization_id')
//       .eq('id', requestId)
//       .single();

//     if (!requestData) {
//       throw new Error('Request not found');
//     }

//     // STEP 4: Perform the assignment with quote requested status
//     const { error } = await supabase
//       .from('maintenance_requests')
//       .update({
//         contractor_id: contractorId,
//         assigned_at: new Date().toISOString(),
//         status: 'requested',
//         quote_requested: true
//       })
//       .eq('id', requestId);

//     if (error) {
//       console.error("Error during contractor assignment:", error);
//       throw error;
//     }

//     // STEP 5: Create a quote record for the contractor dashboard
//     const { error: quoteError } = await supabase
//       .from('quotes')
//       .insert({
//         request_id: requestId,
//         contractor_id: contractorId,
//         amount: 0,
//         description: 'Quote requested',
//         status: 'requested',
//         organization_id: requestData.organization_id
//       });

//     if (quoteError) {
//       console.error("Error creating quote:", quoteError);
//       // Don't throw - assignment is still valid
//     } else {
//       console.log("✅ Quote record created for contractor dashboard");
//     }

//     console.log("✅ Contractor assignment completed successfully");

//     // STEP 6: Create notification (with validation already complete)
//     const notificationSuccess = await createAssignmentNotificationWithPropertyDetails(contractorId, requestId);

//     if (notificationSuccess) {
//       console.log("✅ Assignment notification created successfully");
//     } else {
//       console.warn("⚠️ Assignment completed but notification creation failed");
//     }

//     console.log(`=== CONTRACTOR ASSIGNMENT COMPLETED ===`);

//   } catch (error) {
//     console.error("❌ Contractor assignment failed:", error);
//     throw error;
//   }
// };

// export const changeContractorAssignment = async (requestId: string, contractorId: string) => {
//   const result = await assignContractorToRequest(requestId, contractorId);
//   // The notification is already handled in assignContractorToRequest
//   return result;
// };

// export const requestQuoteForJob = async (requestId: string, contractorId: string) => {
//   const { error } = await supabase
//     .from('maintenance_requests')
//     .update({
//       quote_requested: true
//     })
//     .eq('id', requestId);

//   if (error) throw error;
// };

// // Use the enhanced approveQuoteForJob from quoteOperations.ts
// export { approveQuoteForJob } from './quoteOperations';

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Contractor } from "@/types/contractor";
import { validateAndRepairContractorProfile, validateOrganizationConsistency } from "@/utils/contractorValidation";

// Remove the fetchContractors function - it's now in contractorFetch.ts

// Enhanced helper function with comprehensive validation and auto-repair
const createAssignmentNotificationWithPropertyDetails = async (contractorId: string, requestId: string) => {
  try {
    console.log(`Creating assignment notification for contractor ${contractorId}, request ${requestId}`);

    // Validate and auto-repair contractor profile before creating notification
    const validation = await validateAndRepairContractorProfile(contractorId);

    if (!validation.isValid) {
      console.error("Contractor validation failed:", validation.issues);
      throw new Error(`Contractor validation failed: ${validation.issues.join(", ")}`);
    }

    if (validation.wasRepaired) {
      console.log(`Auto-repaired contractor profile for ${validation.contractor?.company_name}`);
    }

    const contractor = validation.contractor!;

    // Fetch property details for the maintenance request
    const { data: request, error: requestError } = await supabase
      .from("maintenance_requests")
      .select("property_id, site, title, description")
      .eq("id", requestId)
      .single();

    if (requestError || !request?.property_id) {
      console.log("No property_id found for request:", requestId);
      // Get request organization for notification
      const { data: requestData } = await supabase
        .from("maintenance_requests")
        .select("organization_id")
        .eq("id", requestId)
        .single();

      // Create basic notification without property details
      const { error: notificationError } = await supabase.from("notifications").insert({
        title: "Job Assignment",
        message: `You have been assigned to maintenance job #${requestId.substring(0, 8)}`,
        type: "info",
        user_id: contractor.user_id,
        link: `/contractor/jobs/${requestId}`,
        organization_id: requestData?.organization_id,
      });

      return !notificationError;
    }

    // Fetch property details
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("address, practice_leader, practice_leader_email, practice_leader_phone, contact_number, name")
      .eq("id", request.property_id)
      .single();

    // Create detailed message with property information
    let message = `You have been assigned to maintenance job #${requestId.substring(0, 8)}`;

    if (!propertyError && property) {
      message += `\n\nProperty: ${property.name || ""}`;
      message += `\nAddress: ${property.address || ""}`;
      message += `\nPractice Leader: ${property.practice_leader || ""}`;
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

    // Get request organization for notification
    const { data: requestData } = await supabase
      .from("maintenance_requests")
      .select("organization_id")
      .eq("id", requestId)
      .single();

    // Create notification in the database
    const { error: notificationError } = await supabase.from("notifications").insert({
      title: "Job Assignment with Property Details",
      message: message,
      type: "info",
      user_id: contractor.user_id,
      link: `/contractor/jobs/${requestId}`,
      organization_id: requestData?.organization_id,
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
  console.log(`=== STARTING CONTRACTOR ASSIGNMENT ===`);
  console.log(`Assigning contractor ${contractorId} to request ${requestId}`);

  try {
    // STEP 1: Validate organization consistency
    const orgValidation = await validateOrganizationConsistency(requestId, contractorId);

    if (!orgValidation.isValid) {
      console.error("SECURITY VIOLATION:", orgValidation.error);
      throw new Error(`Assignment failed: ${orgValidation.error}`);
    }

    console.log("✅ Organization validation passed");

    // STEP 2: Validate and auto-repair contractor profile
    const contractorValidation = await validateAndRepairContractorProfile(contractorId);

    if (!contractorValidation.isValid) {
      console.error("Contractor profile validation failed:", contractorValidation.issues);
      throw new Error(`Contractor validation failed: ${contractorValidation.issues.join(", ")}`);
    }

    if (contractorValidation.wasRepaired) {
      console.log(`✅ Auto-repaired contractor profile for ${contractorValidation.contractor?.company_name}`);
    } else {
      console.log("✅ Contractor profile validation passed");
    }

    // STEP 3: Get the request organization for quote creation
    const { data: requestData } = await supabase
      .from("maintenance_requests")
      .select("organization_id")
      .eq("id", requestId)
      .single();

    if (!requestData) {
      throw new Error("Request not found");
    }

    // STEP 4: Perform the assignment with quote requested status
    const { error } = await supabase
      .from("maintenance_requests")
      .update({
        contractor_id: contractorId,
        assigned_at: new Date().toISOString(),
        status: "requested",
        quote_requested: true,
      })
      .eq("id", requestId);

    if (error) {
      console.error("Error during contractor assignment:", error);
      throw error;
    }

    // STEP 5: Create a quote record for the contractor dashboard
    const { data: quoteData, error: quoteError } = await supabase.from("quotes").insert({
      request_id: requestId,
      contractor_id: contractorId,
      amount: 0,
      description: "Quote requested",
      status: "requested",
      organization_id: requestData.organization_id,
    }).select().single();

    if (quoteError) {
      console.error("Error creating quote:", quoteError);
      // Don't throw - assignment is still valid
    } else {
      console.log("✅ Quote record created for contractor dashboard");
    }

    console.log("✅ Contractor assignment completed successfully");

    // STEP 6: Create in-app notification (with validation already complete)
    const notificationSuccess = await createAssignmentNotificationWithPropertyDetails(contractorId, requestId);

    if (notificationSuccess) {
      console.log("✅ Assignment notification created successfully");
    } else {
      console.warn("⚠️ Assignment completed but notification creation failed");
    }

    // STEP 7: Send email notification to contractor
    if (quoteData?.id) {
      try {
        // Fetch contractor email
        const { data: contractor } = await supabase
          .from("contractors")
          .select("email, contact_name")
          .eq("id", contractorId)
          .single();

        if (contractor?.email) {
          const { error: emailError } = await supabase.functions.invoke("send-quote-notification", {
            body: {
              quote_id: quoteData.id,
              notification_type: "requested",
              recipient_email: contractor.email,
              recipient_name: contractor.contact_name || "Contractor",
            },
          });

          if (emailError) {
            console.error("Error sending contractor assignment email:", emailError);
          } else {
            console.log("✅ Email notification sent to contractor:", contractor.email);
          }
        } else {
          console.warn("⚠️ No contractor email found for notification");
        }
      } catch (emailErr) {
        console.error("Failed to send contractor email notification:", emailErr);
        // Don't throw - assignment is still valid
      }
    }

    console.log(`=== CONTRACTOR ASSIGNMENT COMPLETED ===`);
  } catch (error) {
    console.error("❌ Contractor assignment failed:", error);
    throw error;
  }
};

export const changeContractorAssignment = async (requestId: string, contractorId: string) => {
  const result = await assignContractorToRequest(requestId, contractorId);
  // The notification is already handled in assignContractorToRequest
  return result;
};

export const requestQuoteForJob = async (requestId: string, contractorId: string) => {
  const { error } = await supabase
    .from("maintenance_requests")
    .update({
      quote_requested: true,
    })
    .eq("id", requestId);

  if (error) throw error;
};

// Use the enhanced approveQuoteForJob from quoteOperations.ts
export { approveQuoteForJob } from "./quoteOperations";
