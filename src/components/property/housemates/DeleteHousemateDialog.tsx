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

interface DeleteHousemateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  housemate: Housemate | null;
  onConfirm: (housemateId: string) => Promise<boolean>;
}

export const DeleteHousemateDialog: React.FC<DeleteHousemateDialogProps> = ({
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
          <AlertDialogTitle>Delete Housemate</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete {housemate.firstName} {housemate.lastName}? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
