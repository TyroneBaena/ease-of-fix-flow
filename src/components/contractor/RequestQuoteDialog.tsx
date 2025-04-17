
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MaintenanceRequest } from '@/types/maintenance';
import { useContractorContext } from '@/contexts/contractor';
import { Separator } from '@/components/ui/separator';
import { Check, Send } from 'lucide-react';
import { toast } from 'sonner';

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
      // Create quote requests for each selected contractor
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

  const resetForm = () => {
    setSelectedContractors([]);
    setIncludeInfo({
      description: true,
      location: true,
      images: true,
      contactDetails: true,
      urgency: true
    });
  };

  // Reset the form when dialog opens
  React.useEffect(() => {
    if (open) {
      resetForm();
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
            {/* Request Summary */}
            <div>
              <h3 className="text-sm font-medium mb-2">Maintenance Request</h3>
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-semibold">{request?.title}</p>
                <p className="text-xs text-muted-foreground mt-1">ID: {request?.id}</p>
              </div>
            </div>
            
            <Separator />
            
            {/* Select Contractors */}
            <div>
              <h3 className="text-sm font-medium mb-3">Select Contractors</h3>
              
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading contractors...</div>
              ) : contractors.length === 0 ? (
                <div className="text-sm text-muted-foreground">No contractors available</div>
              ) : (
                <div className="space-y-2">
                  {contractors.map((contractor) => (
                    <div key={contractor.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`contractor-${contractor.id}`}
                        checked={selectedContractors.includes(contractor.id)}
                        onCheckedChange={() => handleContractorSelection(contractor.id)}
                      />
                      <Label 
                        htmlFor={`contractor-${contractor.id}`}
                        className="flex flex-col cursor-pointer"
                      >
                        <span>{contractor.companyName}</span>
                        <span className="text-xs text-muted-foreground">
                          {contractor.contactName} ({contractor.email})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedContractors.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {selectedContractors.length} contractor(s) selected
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Information to Include */}
            <div>
              <h3 className="text-sm font-medium mb-3">Information to Include</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-description"
                    checked={includeInfo.description}
                    onCheckedChange={() => handleInfoToggle('description')}
                  />
                  <Label htmlFor="include-description">Issue description</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-location"
                    checked={includeInfo.location}
                    onCheckedChange={() => handleInfoToggle('location')}
                  />
                  <Label htmlFor="include-location">Location details</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-images"
                    checked={includeInfo.images}
                    onCheckedChange={() => handleInfoToggle('images')}
                  />
                  <Label htmlFor="include-images">Images & attachments</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-contact"
                    checked={includeInfo.contactDetails}
                    onCheckedChange={() => handleInfoToggle('contactDetails')}
                  />
                  <Label htmlFor="include-contact">Contact details</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-urgency"
                    checked={includeInfo.urgency}
                    onCheckedChange={() => handleInfoToggle('urgency')}
                  />
                  <Label htmlFor="include-urgency">Urgency/priority level</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Notes */}
            <div>
              <h3 className="text-sm font-medium mb-2">Additional Notes</h3>
              <textarea 
                className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-y"
                placeholder="Add any specific instructions or details for the contractors..."
              />
            </div>
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
