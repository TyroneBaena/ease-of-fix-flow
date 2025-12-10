import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Housemate, RENT_PERIOD_LABELS } from '@/types/housemate';
import { format } from 'date-fns';

interface HousemateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  housemate: Housemate | null;
}

export const HousemateViewDialog: React.FC<HousemateViewDialogProps> = ({
  open,
  onOpenChange,
  housemate,
}) => {
  if (!housemate) return null;

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'Not specified';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {housemate.firstName} {housemate.lastName}
            {housemate.isArchived && (
              <Badge variant="secondary">Archived</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rent & Utilities</p>
              <p className="text-sm">{formatCurrency(housemate.rentUtilitiesAmount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Period</p>
              <p className="text-sm">{RENT_PERIOD_LABELS[housemate.rentPeriod]}</p>
            </div>
          </div>

          {housemate.personalProfile && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Personal Profile</p>
              <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                {housemate.personalProfile}
              </p>
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Added on {format(new Date(housemate.createdAt), 'PPP')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
