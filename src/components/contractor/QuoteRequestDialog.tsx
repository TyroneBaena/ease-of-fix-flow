
import React from 'react';
import { RequestQuoteDialog } from './RequestQuoteDialog';
import { MaintenanceRequest } from '@/types/maintenance';

// Define the props interface to match what the components expect
interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestDetails: MaintenanceRequest | null;
  onSubmitQuote: (amount: number, description: string) => void;
}

// Create an adapter component that converts between the old and new interfaces
export const QuoteRequestDialog = ({
  open,
  onOpenChange,
  requestDetails,
  onSubmitQuote,
}: QuoteRequestDialogProps) => {
  // This wrapper component adapts the new RequestQuoteDialog to the old interface
  const handleQuoteSubmitted = () => {
    // We can't access the actual amount and description here as they're managed internally
    // by the RequestQuoteDialog, so we pass dummy values
    // The actual submission happens in the RequestQuoteDialog
    onSubmitQuote(0, '');
  };

  return (
    <RequestQuoteDialog
      open={open}
      onOpenChange={onOpenChange}
      request={requestDetails} // Rename prop from requestDetails to request
      onQuoteSubmitted={handleQuoteSubmitted} // Convert onSubmitQuote to onQuoteSubmitted
    />
  );
};
