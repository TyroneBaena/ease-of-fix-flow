
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { logActivity } from '@/contexts/contractor/operations/helpers/activityHelpers';
import { LandlordAssignmentConfirmDialog } from './LandlordAssignmentConfirmDialog';
import { MaintenanceRequest } from '@/types/maintenance';

interface LandlordAssignmentCardProps {
  requestId: string;
  request: MaintenanceRequest;
  assignedToLandlord?: boolean | null;
  landlordNotes?: string | null;
  onAssigned?: () => void;
}

export const LandlordAssignmentCard: React.FC<LandlordAssignmentCardProps> = ({
  requestId,
  request,
  assignedToLandlord,
  landlordNotes,
  onAssigned,
}) => {
  const { currentUser } = useUserContext();
  const [notes, setNotes] = useState<string>(landlordNotes || '');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirmAssignment = async (assignmentNotes: string) => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          assigned_to_landlord: true,
          landlord_notes: assignmentNotes || null,
          landlord_assigned_at: new Date().toISOString(),
          landlord_assigned_by: currentUser.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      await logActivity({
        requestId,
        actionType: 'landlord_assignment',
        description: 'Request assigned to landlord',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        metadata: { notes: assignmentNotes },
      });

      toast.success('Assigned to landlord');
      onAssigned?.();
    } catch (e) {
      console.error('Assign to landlord failed', e);
      toast.error('Failed to assign to landlord');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = () => {
    setShowConfirmDialog(true);
  };

  const handleUnassign = async () => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          assigned_to_landlord: false,
          // keep landlord_notes as historical; leave timestamps null
          landlord_assigned_at: null,
          landlord_assigned_by: null,
        })
        .eq('id', requestId);
      if (error) throw error;

      await logActivity({
        requestId,
        actionType: 'landlord_unassigned',
        description: 'Request unassigned from landlord',
        actorName: currentUser.name,
        actorRole: currentUser.role,
      });

      toast.success('Unassigned from landlord');
      onAssigned?.();
    } catch (e) {
      console.error('Unassign landlord failed', e);
      toast.error('Failed to unassign landlord');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-3">Landlord Assignment</h3>
      {assignedToLandlord ? (
        <div className="space-y-3 text-sm">
          <p>This request is currently assigned to the landlord.</p>
          <Button variant="outline" className="w-full" onClick={handleUnassign} disabled={loading}>
            {loading ? 'Unassigning...' : 'Unassign Landlord'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            placeholder="Optional notes for the landlord"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button className="w-full" onClick={handleAssignClick} disabled={loading}>
            {loading ? 'Assigning...' : 'Assign to Landlord'}
          </Button>
        </div>
      )}

      <LandlordAssignmentConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        request={request}
        onConfirm={handleConfirmAssignment}
        loading={loading}
      />
    </Card>
  );
};
