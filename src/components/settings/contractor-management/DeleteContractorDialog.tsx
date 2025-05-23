
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';
import { Contractor } from '@/types/contractor';

interface DeleteContractorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onConfirmDelete: (selectedContractor: Contractor | null) => Promise<void>;
  selectedContractor: Contractor | null;
}

const DeleteContractorDialog = ({
  isOpen,
  onOpenChange,
  isLoading,
  onConfirmDelete,
  selectedContractor
}: DeleteContractorDialogProps) => {
  const handleDelete = async () => {
    await onConfirmDelete(selectedContractor);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Contractor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this contractor? This action cannot be undone.
            This will remove the contractor from the system and break any associations with 
            maintenance requests.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteContractorDialog;
