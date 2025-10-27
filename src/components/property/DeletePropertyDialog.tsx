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
import { Property } from '@/types/property';

interface DeletePropertyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  onConfirmDelete: () => Promise<void>;
  property: Property | null;
}

const DeletePropertyDialog = ({
  isOpen,
  onOpenChange,
  isLoading,
  onConfirmDelete,
  property
}: DeletePropertyDialogProps) => {
  const handleDelete = async () => {
    await onConfirmDelete();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Property</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{property?.name}"? This action cannot be undone.
            <br /><br />
            <strong>Warning:</strong> This will permanently:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Remove the property from the system</li>
              <li>Delete all maintenance requests associated with this property</li>
              <li>Remove all budget data and financial records</li>
              <li>Unassign all contractors from related requests</li>
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
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

export default DeletePropertyDialog;
