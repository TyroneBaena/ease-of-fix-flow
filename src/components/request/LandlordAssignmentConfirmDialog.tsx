import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MaintenanceRequest } from '@/types/maintenance';
import { Mail, FileText, MapPin, User, Calendar } from 'lucide-react';

interface LandlordAssignmentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
  onConfirm: (notes: string) => Promise<void>;
  loading?: boolean;
}

export const LandlordAssignmentConfirmDialog: React.FC<LandlordAssignmentConfirmDialogProps> = ({
  open,
  onOpenChange,
  request,
  onConfirm,
  loading = false,
}) => {
  const [notes, setNotes] = useState('');

  const handleConfirm = async () => {
    await onConfirm(notes);
    setNotes('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNotes('');
    onOpenChange(false);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Confirm Landlord Assignment
          </DialogTitle>
          <DialogDescription>
            The following information will be sent to the landlord via email notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                  <p className="text-sm">{request.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant="outline" className="mt-1">
                    {request.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                    <p className="text-sm">{request.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                    <p className="text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {request.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded-md">{request.description}</p>
                </div>
              )}

              {request.submittedBy && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Submitted By</Label>
                    <p className="text-sm">{request.submittedBy}</p>
                  </div>
                </div>
              )}

              {request.priority && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                  <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'} className="mt-1">
                    {request.priority}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="landlord-notes">Additional Notes for Landlord (Optional)</Label>
            <Textarea
              id="landlord-notes"
              placeholder="Add any additional context or instructions for the landlord..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Email Information */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> An email notification will be sent to the landlord with the above information
              and a link to view the full request details.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Assigning...' : 'Assign to Landlord'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};