
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useContractorContext } from '@/contexts/contractor';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';

interface IncludeInfo {
  description: boolean;
  location: boolean;
  images: boolean;
  contactDetails: boolean;
  urgency: boolean;
}

export const useQuoteRequestSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestQuote } = useContractorContext();

  const createNotificationForContractor = async (contractorId: string, requestId: string) => {
    try {
      // Get contractor details
      const { data: contractor, error: contractorError } = await supabase
        .from('contractors')
        .select('user_id, company_name')
        .eq('id', contractorId)
        .single();
      
      if (contractorError) {
        console.error("Error fetching contractor:", contractorError);
        throw contractorError;
      }
      
      if (!contractor?.user_id) {
        console.error("Missing user_id for contractor:", contractorId);
        throw new Error("Contractor user_id not found");
      }
      
      // Create notification in the database
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'New Quote Request',
          message: `You have a new quote request for maintenance job #${requestId.substring(0, 8)}`,
          type: 'info',
          user_id: contractor.user_id,
          link: `/contractor/jobs/${requestId}`
        });
        
      if (notificationError) {
        console.error("Error creating notification:", notificationError);
        throw notificationError;
      }
      
      console.log(`Notification created for contractor ${contractor.company_name}`);
    } catch (error) {
      console.error("Failed to create notification:", error);
      throw error;
    }
  };

  const submitQuoteRequests = async (
    requestDetails: MaintenanceRequest,
    selectedContractors: string[],
    includeInfo: IncludeInfo,
    notes: string,
    onSuccess: () => void
  ) => {
    if (!requestDetails?.id) {
      toast.error("Request details are missing");
      return;
    }

    if (selectedContractors.length === 0) {
      toast.error("Please select at least one contractor");
      return;
    }

    setIsSubmitting(true);
    let successfulRequests = 0;
    let failedRequests = 0;
    
    try {
      console.log("QuoteRequestSubmission - Submitting quote requests for contractors:", selectedContractors);
      
      // Process each contractor request sequentially to avoid race conditions
      for (const contractorId of selectedContractors) {
        try {
          // Request the quote first
          await requestQuote(requestDetails.id!, contractorId, includeInfo, notes);
          
          // Then create a notification for the contractor
          await createNotificationForContractor(contractorId, requestDetails.id!);
          
          successfulRequests++;
          console.log(`Successfully processed quote request for contractor: ${contractorId}`);
        } catch (contractorError) {
          console.error(`Error processing contractor ${contractorId}:`, contractorError);
          failedRequests++;
        }
      }
      
      // Update the maintenance request to mark quote as requested only if at least one succeeded
      if (successfulRequests > 0) {
        const { error: updateError } = await supabase
          .from('maintenance_requests')
          .update({
            quote_requested: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestDetails.id);
          
        if (updateError) {
          console.error("Error updating maintenance request:", updateError);
          throw updateError;
        }
      }
      
      // Show appropriate success/error messages
      if (successfulRequests > 0 && failedRequests === 0) {
        toast.success(`Quote requests sent to ${successfulRequests} contractor(s)`);
      } else if (successfulRequests > 0 && failedRequests > 0) {
        toast.success(`Quote requests sent to ${successfulRequests} contractor(s). ${failedRequests} failed.`);
      } else {
        toast.error("Failed to send quote requests to any contractors");
        return; // Don't close dialog if all failed
      }
      
      // Close dialog only on success
      onSuccess();
      
    } catch (error) {
      console.error("Error in quote request process:", error);
      toast.error("Failed to request quotes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitQuoteRequests
  };
};
