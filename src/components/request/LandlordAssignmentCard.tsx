
import React, { useState, useEffect } from 'react';
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
  const [property, setProperty] = useState<any>(null);

  // Fetch property data when component mounts
  useEffect(() => {
    const fetchProperty = async () => {
      if (!request.propertyId) return;
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', request.propertyId)
          .single();
        
        if (error) {
          console.error('Error fetching property:', error);
          return;
        }
        
        setProperty(data);
      } catch (err) {
        console.error('Error fetching property:', err);
      }
    };

    fetchProperty();
  }, [request.propertyId]);

  const handleConfirmAssignment = async (assignmentNotes: string, landlordEmail: string) => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setLoading(true);
      
      // Store the landlord email for future notifications
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

      // Call email notification function
      const { error: emailError } = await supabase.functions.invoke('notify-landlord-assignment', {
        body: {
          request_id: requestId,
          landlord_email: landlordEmail,
          landlord_name: 'Landlord' // Could be enhanced to get actual name
        }
      });

      if (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the assignment if email fails
      }

      await logActivity({
        requestId,
        actionType: 'landlord_assignment',
        description: `Request assigned to landlord (${landlordEmail})`,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        metadata: { notes: assignmentNotes, landlordEmail },
      });

      toast.success('Assigned to landlord and notification sent');
      onAssigned?.();
    } catch (e) {
      console.error('Assign to landlord failed', e);
      toast.error('Failed to assign to landlord');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = () => {
    console.log('Assign button clicked, opening dialog');
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
        onOpenChange={(open) => {
          console.log('Dialog open state changing to:', open);
          setShowConfirmDialog(open);
        }}
        request={request}
        property={property}
        onConfirm={handleConfirmAssignment}
        loading={loading}
      />
    </Card>
  );
};
