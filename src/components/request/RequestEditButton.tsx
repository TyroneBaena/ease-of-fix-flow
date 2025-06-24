
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Edit } from 'lucide-react';
import { EditRequestDialog } from './EditRequestDialog';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUserContext } from '@/contexts/UserContext';

interface RequestEditButtonProps {
  request: MaintenanceRequest;
  onRequestUpdated: () => void;
}

export const RequestEditButton = ({ request, onRequestUpdated }: RequestEditButtonProps) => {
  const { currentUser, isAdmin } = useUserContext();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Check if user can edit requests (admins and managers)
  const canEditRequests = isAdmin || currentUser?.role === 'manager';

  if (!canEditRequests) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditDialogOpen(true)}
        className="hover:bg-blue-50"
      >
        <Edit className="h-4 w-4" />
      </Button>
      
      <EditRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        request={request}
        onRequestUpdated={onRequestUpdated}
      />
    </>
  );
};
