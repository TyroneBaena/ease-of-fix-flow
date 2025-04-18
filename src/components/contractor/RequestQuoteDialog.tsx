
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { useContractorContext } from '@/contexts/contractor';
import { MaintenanceRequest } from '@/types/maintenance';
import { QuoteSummary } from './quote-dialog/QuoteSummary';
import { ContractorSelection } from './quote-dialog/ContractorSelection';
import { IncludeInfoSection } from './quote-dialog/IncludeInfoSection';
import { AdditionalNotes } from './quote-dialog/AdditionalNotes';

interface RequestQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
}

export const RequestQuoteDialog = ({
  open,
  onOpenChange,
  request,
}: RequestQuoteDialogProps) => {
  const { contractors, loading, requestQuote } = useContractorContext();
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [includeInfo, setIncludeInfo] = useState({
    description: true,
    location: true,
    images: true,
    contactDetails: true,
    urgency: true
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContractorSelection = (contractorId: string) => {
    setSelectedContractors(prev => 
      prev.includes(contractorId)
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    );
  };

  const handleInfoToggle = (infoType: keyof typeof includeInfo) => {
    setIncludeInfo(prev => ({
      ...prev,
      [infoType]: !prev[infoType]
    }));
  };

  const handleSubmit = async () => {
    if (!request) return;
    if (selectedContractors.length === 0) {
      toast.error('Please select at least one contractor');
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedContractors.map(contractorId => 
          requestQuote(request.id, contractorId)
        )
      );
      
      toast.success(`Quote request sent to ${selectedContractors.length} contractor(s)`);
      setSelectedContractors([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send quote requests:', error);
      toast.error('Failed to send quote requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Request Quotes for Maintenance Job</DialogTitle>
          <DialogDescription>
            Send request to selected contractors to provide quotes for this maintenance job.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 overflow-y-auto max-h-[calc(85vh-200px)]">
          <div className="space-y-4 pr-2">
            <QuoteSummary request={request} />
            
            <Separator />
            
            <ContractorSelection
              contractors={contractors}
              selectedContractors={selectedContractors}
              onContractorSelection={handleContractorSelection}
              loading={loading}
            />
            
            <Separator />
            
            <IncludeInfoSection
              includeInfo={includeInfo}
              onInfoToggle={handleInfoToggle}
            />
            
            <Separator />
            
            <AdditionalNotes
              value={notes}
              onChange={setNotes}
            />
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedContractors.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
