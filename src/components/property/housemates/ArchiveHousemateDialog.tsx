import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Housemate } from '@/types/housemate';

interface ArchiveHousemateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  housemate: Housemate | null;
  onConfirm: (housemateId: string) => Promise<boolean>;
}

export const ArchiveHousemateDialog: React.FC<ArchiveHousemateDialogProps> = ({
  open,
  onOpenChange,
  housemate,
  onConfirm,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!housemate) return;
    
    setSubmitting(true);
    const success = await onConfirm(housemate.id);
    setSubmitting(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  if (!housemate) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Housemate</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive {housemate.firstName} {housemate.lastName}? 
            They will be hidden from the active list but can be restored later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Archiving...' : 'Archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
