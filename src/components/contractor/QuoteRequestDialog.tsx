
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContractorSelection } from './quote-dialog/ContractorSelection';
import { IncludeInfoSection } from './quote-dialog/IncludeInfoSection';
import { AdditionalNotes } from './quote-dialog/AdditionalNotes';
import { MaintenanceRequest } from '@/types/maintenance';
import { useQuoteRequestDialog } from '@/hooks/contractor/useQuoteRequestDialog';
import { useQuoteRequestSubmission } from '@/hooks/contractor/useQuoteRequestSubmission';

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestDetails: MaintenanceRequest | null;
  onSubmitQuote: (amount: number, description: string) => void;
  onSuccess?: () => void; // Add optional success callback for refreshing data
}

export const QuoteRequestDialog = ({
  open,
  onOpenChange,
  requestDetails,
  onSubmitQuote,
  onSuccess,
}: QuoteRequestDialogProps) => {
  const {
    selectedContractors,
    includeInfo,
    notes,
    contractors,
    loading,
    setNotes,
    handleContractorSelection,
    handleInfoToggle
  } = useQuoteRequestDialog(open, requestDetails?.id);

  const { isSubmitting, submitQuoteRequests } = useQuoteRequestSubmission();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestDetails) return;

    await submitQuoteRequests(
      requestDetails,
      selectedContractors,
      includeInfo,
      notes,
      () => {
        onOpenChange(false);
        // Call the success callback to refresh data if provided
        if (onSuccess) {
          onSuccess();
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[90vh] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle>Request Quotes</DialogTitle>
          <DialogDescription>
            Send quote requests to contractors for this maintenance request.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
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

              <div className="flex justify-end space-x-2 pt-4 pb-6">
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
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
