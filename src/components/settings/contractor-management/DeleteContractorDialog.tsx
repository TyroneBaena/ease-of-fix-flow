
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
  onConfirmDelete: () => Promise<void>;
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
    await onConfirmDelete();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Contractor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{selectedContractor?.companyName}"? This action cannot be undone.
            <br /><br />
            <strong>Warning:</strong> This will permanently remove:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>The contractor from the system</li>
              <li>All quotes submitted by this contractor</li>
              <li>Any associations with maintenance requests</li>
            </ul>
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
              'Delete Permanently'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteContractorDialog;
