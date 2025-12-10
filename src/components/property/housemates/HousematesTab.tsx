import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Users } from 'lucide-react';
import { useHousemates } from '@/hooks/useHousemates';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { Housemate, RentPeriod } from '@/types/housemate';
import { HousematesTable } from './HousematesTable';
import { HousemateFormDialog } from './HousemateFormDialog';
import { HousemateViewDialog } from './HousemateViewDialog';
import { HousemateMoveDialog } from './HousemateMoveDialog';
import { ArchiveHousemateDialog } from './ArchiveHousemateDialog';
import { DeleteHousemateDialog } from './DeleteHousemateDialog';

interface HousematesTabProps {
  propertyId: string;
}

export const HousematesTab: React.FC<HousematesTabProps> = ({ propertyId }) => {
  const { currentUser } = useUserContext();
  const { properties } = usePropertyContext();
  const {
    housemates,
    loading,
    fetchHousemates,
    addHousemate,
    updateHousemate,
    moveHousemate,
    archiveHousemate,
    unarchiveHousemate,
    deleteHousemate,
  } = useHousemates();

  const [showArchived, setShowArchived] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHousemate, setSelectedHousemate] = useState<Housemate | null>(null);
  const [editingHousemate, setEditingHousemate] = useState<Housemate | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (propertyId) {
      fetchHousemates(propertyId, showArchived);
    }
  }, [propertyId, showArchived, fetchHousemates]);

  const handleAdd = () => {
    setEditingHousemate(null);
    setFormDialogOpen(true);
  };

  const handleView = (housemate: Housemate) => {
    setSelectedHousemate(housemate);
    setViewDialogOpen(true);
  };

  const handleEdit = (housemate: Housemate) => {
    setEditingHousemate(housemate);
    setFormDialogOpen(true);
  };

  const handleMove = (housemate: Housemate) => {
    setSelectedHousemate(housemate);
    setMoveDialogOpen(true);
  };

  const handleArchive = (housemate: Housemate) => {
    setSelectedHousemate(housemate);
    setArchiveDialogOpen(true);
  };

  const handleDelete = (housemate: Housemate) => {
    setSelectedHousemate(housemate);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: {
    firstName: string;
    lastName: string;
    rentUtilitiesAmount?: number;
    rentPeriod: RentPeriod;
    personalProfile?: string;
  }): Promise<boolean> => {
    if (editingHousemate) {
      return updateHousemate(editingHousemate.id, data);
    } else {
      return addHousemate({
        ...data,
        propertyId,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Housemates
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="showArchived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="showArchived" className="text-sm">
              Show Archived
            </Label>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Housemate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <HousematesTable
          housemates={housemates}
          loading={loading}
          isAdmin={isAdmin}
          onView={handleView}
          onEdit={handleEdit}
          onMove={handleMove}
          onArchive={handleArchive}
          onUnarchive={(h) => unarchiveHousemate(h.id)}
          onDelete={handleDelete}
        />

        <HousemateFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          editingHousemate={editingHousemate}
          onSubmit={handleFormSubmit}
        />

        <HousemateViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          housemate={selectedHousemate}
        />

        <HousemateMoveDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          housemate={selectedHousemate}
          currentPropertyId={propertyId}
          properties={properties}
          onConfirm={moveHousemate}
        />

        <ArchiveHousemateDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          housemate={selectedHousemate}
          onConfirm={archiveHousemate}
        />

        <DeleteHousemateDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          housemate={selectedHousemate}
          onConfirm={deleteHousemate}
        />
      </CardContent>
    </Card>
  );
};
