
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ContractorSelection } from './quote-dialog/ContractorSelection';
import { IssueDetails } from './quote-dialog/IssueDetails';
import { ContactInformation } from './quote-dialog/ContactInformation';
import { IncludeInfoSection } from './quote-dialog/IncludeInfoSection';
import { AdditionalNotes } from './quote-dialog/AdditionalNotes';
import { useContractorContext } from '@/contexts/contractor';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestDetails: MaintenanceRequest | null;
  onSubmitQuote: (amount: number, description: string) => void;
}

export const QuoteRequestDialog = ({
  open,
  onOpenChange,
  requestDetails,
  onSubmitQuote,
}: QuoteRequestDialogProps) => {
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [includeInfo, setIncludeInfo] = useState({
    description: true,
    location: true,
    images: true,
    contactDetails: true,
    urgency: true
  });
  const [notes, setNotes] = useState('');
  const { contractors, loading, loadContractors, requestQuote } = useContractorContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load contractors when dialog opens
  useEffect(() => {
    if (open) {
      console.log("QuoteRequestDialog - Dialog opened, loading contractors");
      loadContractors();
      setSelectedContractors([]);
      setIncludeInfo({
        description: true,
        location: true,
        images: true,
        contactDetails: true,
        urgency: true
      });
      setNotes('');
    }
  }, [open]);

  // Debug logging for contractors
  useEffect(() => {
    console.log("QuoteRequestDialog - Contractors updated:", contractors);
    console.log("QuoteRequestDialog - Loading state:", loading);
  }, [contractors, loading]);

  const handleContractorSelection = (contractorId: string) => {
    setSelectedContractors(prev =>
      prev.includes(contractorId)
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    );
  };

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
      throw error; // Re-throw to handle in parent function
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestDetails?.id) {
      toast.error("Request details are missing");
      return;
    }

    if (selectedContractors.length === 0) {
      toast.error("Please select at least one contractor");
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log("QuoteRequestDialog - Submitting quote requests for contractors:", selectedContractors);
      
      // Process each contractor request sequentially to avoid race conditions
      for (const contractorId of selectedContractors) {
        try {
          // Request the quote first
          await requestQuote(requestDetails.id!, contractorId, includeInfo, notes);
          
          // Then create a notification for the contractor
          await createNotificationForContractor(contractorId, requestDetails.id!);
          
          console.log(`Successfully processed quote request for contractor: ${contractorId}`);
        } catch (contractorError) {
          console.error(`Error processing contractor ${contractorId}:`, contractorError);
          // Continue with other contractors even if one fails
          toast.error(`Failed to send quote request to one contractor`);
        }
      }
      
      // Update the maintenance request to mark quote as requested
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
      
      // Show success message
      toast.success(`Quote requests sent to ${selectedContractors.length} contractor(s)`);
      
      // Close dialog
      onOpenChange(false);
      
    } catch (error) {
      console.error("Error in quote request process:", error);
      toast.error("Failed to request quotes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle toggling include info options
  const handleInfoToggle = (infoType: string) => {
    setIncludeInfo(prev => ({
      ...prev,
      [infoType]: !prev[infoType as keyof typeof prev]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Quotes</DialogTitle>
          <DialogDescription>
            Send quote requests to contractors for this maintenance request
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ContractorSelection
            contractors={contractors}
            selectedContractors={selectedContractors}
            onContractorSelection={handleContractorSelection}
            loading={loading}
          />

          <IncludeInfoSection
            includeInfo={includeInfo}
            onInfoToggle={handleInfoToggle}
          />

          <AdditionalNotes
            value={notes}
            onChange={setNotes}
          />

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedContractors.length === 0}
            >
              {isSubmitting ? "Sending..." : "Send Quote Requests"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
