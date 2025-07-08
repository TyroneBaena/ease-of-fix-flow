
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Request Quotes</DialogTitle>
          <DialogDescription>
            Send quote requests to contractors for this maintenance request.
            <span className="block mt-2 text-sm text-blue-600 font-medium">
              ✓ Site details (property address, site phone, practice leader info) are automatically included with every quote request
            </span>
            {selectedContractors.length > 0 && (
              <span className="block mt-1 text-sm text-amber-600">
                Previously selected contractors are pre-selected
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
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

            <div className="flex justify-end space-x-2 pt-4">
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
      </DialogContent>
    </Dialog>
  );
};
