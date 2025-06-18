
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
    const errors: string[] = [];
    
    try {
      console.log("QuoteRequestSubmission - Submitting quote requests for contractors:", selectedContractors);
      console.log("Site details (property address, site phone, practice leader info) will be automatically included with ALL quote requests");
      
      // Process each contractor request sequentially to avoid race conditions
      for (const contractorId of selectedContractors) {
        try {
          console.log(`Processing quote request for contractor: ${contractorId} with automatic site details inclusion`);
          
          // Request the quote with site details automatically included
          await requestQuote(requestDetails.id!, contractorId, includeInfo, notes);
          
          successfulRequests++;
          console.log(`Successfully processed quote request with automatic site details for contractor: ${contractorId}`);
        } catch (contractorError: any) {
          console.error(`Error processing contractor ${contractorId}:`, contractorError);
          failedRequests++;
          errors.push(`Contractor ${contractorId}: ${contractorError.message || 'Unknown error'}`);
        }
      }
      
      // Show appropriate success/error messages
      if (successfulRequests > 0 && failedRequests === 0) {
        toast.success(`Quote requests with site details sent to ${successfulRequests} contractor(s)`);
        onSuccess();
      } else if (successfulRequests > 0 && failedRequests > 0) {
        toast.success(`Quote requests sent to ${successfulRequests} contractor(s). ${failedRequests} failed.`);
        console.error("Failed requests details:", errors);
        onSuccess();
      } else {
        toast.error("Failed to send quote requests to any contractors");
        console.error("All requests failed. Errors:", errors);
        // Don't close dialog if all failed
      }
      
    } catch (error: any) {
      console.error("Error in quote request process:", error);
      toast.error(`Failed to request quotes: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitQuoteRequests
  };
};
