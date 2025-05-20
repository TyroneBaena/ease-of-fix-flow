
import React, { useState, useRef } from 'react';
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
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const submittingRef = useRef(false);

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
      onSubmitQuote(numericAmount, description);
      
      // Reset form state
      setAmount('');
      setDescription('');
      
      // Close the dialog
      onOpenChange(false);
      
      // Reset submission flag after a short delay
      setTimeout(() => {
        submittingRef.current = false;
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Submit Quote</DialogTitle>
          <DialogDescription>
            Request {requestDetails?.id}: {requestDetails?.title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <IssueDetails
              location={requestDetails?.location}
              priority={requestDetails?.priority}
              description={requestDetails?.description}
            />

            <Separator />

            <ContactInformation
              site={requestDetails?.site}
              address={requestDetails?.address}
              submittedBy={requestDetails?.submittedBy}
              contactNumber={requestDetails?.contactNumber}
              practiceLeader={requestDetails?.practiceLeader}
              practiceLeaderPhone={requestDetails?.practiceLeaderPhone}
            />

            <Separator />

            <AttachmentGallery attachments={requestDetails?.attachments} />
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
