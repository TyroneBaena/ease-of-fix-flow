import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IssueDetails } from './quote-dialog/IssueDetails';
import { ContactInformation } from './quote-dialog/ContactInformation';
import { AttachmentGallery } from './quote-dialog/AttachmentGallery';
import { QuoteForm } from './quote-dialog/QuoteForm';
import { MaintenanceRequest } from '@/types/maintenance';
import { useContractorContext } from '@/contexts/contractor';
import { toast } from 'sonner';

interface RequestQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
  onQuoteSubmitted: () => void;
}

export const RequestQuoteDialog = ({
  open,
  onOpenChange,
  request,
  onQuoteSubmitted,
}: RequestQuoteDialogProps) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitQuote, contractors } = useContractorContext();
  const submittingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Reset the form when dialog is opened or closed
  useEffect(() => {
    if (!open) {
      // Reset the submission flag and loaded flag when dialog is closed
      submittingRef.current = false;
      hasLoadedRef.current = false;
      setAmount('');
      setDescription('');
      setIsSubmitting(false);
    }
  }, [open]);

  // Add a useEffect to log when contractors are loaded
  useEffect(() => {
    console.log("RequestQuoteDialog - Current contractors:", contractors);
  }, [contractors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (submittingRef.current || isSubmitting) {
      return;
    }
    
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && request?.id) {
      try {
        // Set the submission flags
        submittingRef.current = true;
        setIsSubmitting(true);
        
        console.log(`Submitting quote: Amount: ${numericAmount}, Description: ${description}`);
        
        // Submit quote to the database
        await submitQuote(request.id, numericAmount, description);
        
        // Handle successful submission
        console.log("Quote submitted successfully");
        
        // Use the specialized handler for quote submission
        onQuoteSubmitted();
        
        // Reset form state
        setAmount('');
        setDescription('');
        
        // Close the dialog
        onOpenChange(false);
      } catch (error) {
        console.error("Error submitting quote:", error);
        toast.error("Failed to submit quote. Please try again.");
      } finally {
        // Reset submission flags
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    } else {
      toast.error("Please enter a valid amount");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Submit Quote</DialogTitle>
          <DialogDescription>
            Request {request?.id}: {request?.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6 pb-4">
            <IssueDetails
              location={request?.location}
              priority={request?.priority}
              description={request?.description}
            />

            <Separator />

            <ContactInformation
              site={request?.site}
              address={request?.address}
              submittedBy={request?.submittedBy}
              contactNumber={request?.contactNumber}
              practiceLeader={request?.practiceLeader}
              practiceLeaderPhone={request?.practiceLeaderPhone}
            />

            <Separator />

            <AttachmentGallery attachments={request?.attachments} />
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <QuoteForm
          amount={amount}
          description={description}
          onAmountChange={setAmount}
          onDescriptionChange={(value) => setDescription(value)}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};
