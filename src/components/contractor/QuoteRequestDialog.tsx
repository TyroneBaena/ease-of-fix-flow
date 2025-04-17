
import React from 'react';
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
  onSubmitQuote: (amount: number, description: string) => void;
}

export const QuoteRequestDialog = ({
  open,
  onOpenChange,
  requestDetails,
  onSubmitQuote,
}: QuoteRequestDialogProps) => {
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount)) {
      onSubmitQuote(numericAmount, description);
      setAmount('');
      setDescription('');
      onOpenChange(false);
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
