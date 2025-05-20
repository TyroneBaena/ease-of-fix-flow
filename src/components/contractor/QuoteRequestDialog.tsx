
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
import { useContractorContext } from '@/contexts/contractor';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from 'sonner';

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
    requestDetails: true,
    contactInfo: true,
    photos: true
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
        requestDetails: true,
        contactInfo: true,
        photos: true
      });
      setNotes('');
    }
  }, [open, loadContractors]);

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
      
      // Request quotes from all selected contractors
      await Promise.all(
        selectedContractors.map(contractorId =>
          requestQuote(requestDetails.id!, contractorId, includeInfo, notes)
        )
      );
      
      toast.success(`Quote requests sent to ${selectedContractors.length} contractor(s)`);
      onSubmitQuote(0, ''); // Just to trigger the parent's callback
      onOpenChange(false);
    } catch (error) {
      console.error("Error requesting quotes:", error);
      toast.error("Failed to request quotes");
    } finally {
      setIsSubmitting(false);
    }
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
            setIncludeInfo={setIncludeInfo}
          />

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific details or questions for the contractors..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

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
