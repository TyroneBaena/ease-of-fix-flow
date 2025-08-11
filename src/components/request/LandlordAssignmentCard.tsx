
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { logActivity } from '@/contexts/contractor/operations/helpers/activityHelpers';

interface LandlordAssignmentCardProps {
  requestId: string;
  assignedToLandlord?: boolean | null;
  landlordNotes?: string | null;
  onAssigned?: () => void;
}

export const LandlordAssignmentCard: React.FC<LandlordAssignmentCardProps> = ({
  requestId,
  assignedToLandlord,
  landlordNotes,
  onAssigned,
}) => {
  const { currentUser } = useUserContext();
  const [notes, setNotes] = useState<string>(landlordNotes || '');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
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
          landlord_notes: notes || null,
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
        metadata: { notes },
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

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-3">Landlord Assignment</h3>
      {assignedToLandlord ? (
        <div className="text-sm">
          <p className="mb-2">This request is currently assigned to the landlord.</p>
          {landlordNotes && (
            <div className="bg-muted p-3 rounded text-muted-foreground">
              <div className="font-medium mb-1">Notes</div>
              <div className="whitespace-pre-wrap">{landlordNotes}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            placeholder="Optional notes for the landlord"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button className="w-full" onClick={handleAssign} disabled={loading}>
            {loading ? 'Assigning...' : 'Assign to Landlord'}
          </Button>
        </div>
      )}
    </Card>
  );
};
