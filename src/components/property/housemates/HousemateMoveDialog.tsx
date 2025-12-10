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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Housemate } from '@/types/housemate';
import { Property } from '@/types/property';

interface HousemateMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  housemate: Housemate | null;
  currentPropertyId: string;
  properties: Property[];
  onConfirm: (housemateId: string, newPropertyId: string) => Promise<boolean>;
}

export const HousemateMoveDialog: React.FC<HousemateMoveDialogProps> = ({
  open,
  onOpenChange,
  housemate,
  currentPropertyId,
  properties,
  onConfirm,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const availableProperties = properties.filter((p) => p.id !== currentPropertyId);

  const handleConfirm = async () => {
    if (!housemate || !selectedPropertyId) return;
    
    setSubmitting(true);
    const success = await onConfirm(housemate.id, selectedPropertyId);
    setSubmitting(false);
    
    if (success) {
      setSelectedPropertyId('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPropertyId('');
    }
    onOpenChange(newOpen);
  };

  if (!housemate) return null;

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Move Housemate</DialogTitle>
          <DialogDescription>
            Move {housemate.firstName} {housemate.lastName} to a different property.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="targetProperty">Select New Property</Label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a property..." />
              </SelectTrigger>
              <SelectContent>
                {availableProperties.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No other properties available
                  </SelectItem>
                ) : (
                  availableProperties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedProperty && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="font-medium">Moving to:</p>
              <p>{selectedProperty.name}</p>
              <p className="text-muted-foreground">{selectedProperty.address}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPropertyId || submitting}
          >
            {submitting ? 'Moving...' : 'Move Housemate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
