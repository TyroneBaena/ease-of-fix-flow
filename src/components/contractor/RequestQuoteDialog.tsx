
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IssueDetails } from './quote-dialog/IssueDetails';
import { ContactInformation } from './quote-dialog/ContactInformation';
import { AttachmentGallery } from './quote-dialog/AttachmentGallery';
import { QuoteForm } from './quote-dialog/QuoteForm';
import { useContractorContext } from '@/contexts/contractor';
import { toast } from '@/lib/toast';

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestDetails: {
    id: string;
    title: string;
    date: string;
    description?: string;
    location?: string;
    priority?: string;
    site?: string;
    submittedBy?: string;
    contactNumber?: string;
    address?: string;
    practiceLeader?: string;
    practiceLeaderPhone?: string;
    attachments?: Array<{ url: string }>;
  } | null;
}

export const QuoteRequestDialog = ({
  open,
  onOpenChange,
  requestDetails,
}: QuoteRequestDialogProps) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submitQuote } = useContractorContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDetails?.id) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitQuote(requestDetails.id, numericAmount, description);
      toast.success('Quote submitted successfully');
      setAmount('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote');
    } finally {
      setIsSubmitting(false);
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
          onDescriptionChange={setDescription}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};
