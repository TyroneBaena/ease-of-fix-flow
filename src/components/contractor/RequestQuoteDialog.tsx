
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
  const submittingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Reset the flags when dialog is opened or closed
  useEffect(() => {
    if (!open) {
      // Reset the submission flag and loaded flag when dialog is closed
      submittingRef.current = false;
      hasLoadedRef.current = false;
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (submittingRef.current) {
      return;
    }
    
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount)) {
      // Set the submission flag
      submittingRef.current = true;
      
      // Submit quote and close dialog
      // Use the specialized handler for quote submission
      onQuoteSubmitted();
      
      // Reset form state
      setAmount('');
      setDescription('');
      
      // Close the dialog
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Submit Quote</DialogTitle>
          <DialogDescription>
            Request {request?.id}: {request?.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
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
        />
      </DialogContent>
    </Dialog>
  );
};
