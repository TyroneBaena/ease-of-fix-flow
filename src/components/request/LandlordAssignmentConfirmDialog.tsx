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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MaintenanceRequest } from '@/types/maintenance';
import { Mail, FileText, MapPin, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface LandlordAssignmentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
  property?: any;
  onConfirm: (notes: string, landlordEmail: string, reportOptions: any) => Promise<void>;
  loading?: boolean;
}

export const LandlordAssignmentConfirmDialog: React.FC<LandlordAssignmentConfirmDialogProps> = ({
  open,
  onOpenChange,
  request,
  property,
  onConfirm,
  loading = false,
}) => {
  const [notes, setNotes] = useState('');
  const [landlordEmail, setLandlordEmail] = useState('');
  const [reportOptions, setReportOptions] = useState({
    summary: true,
    property: true,
    issue: true,
    photos: true,
    practiceLeader: false
  });

  // Set default email when dialog opens
  React.useEffect(() => {
    if (open && property) {
      const defaultEmail = property.practice_leader_email || property.email || '';
      setLandlordEmail(defaultEmail);
    }
  }, [open, property]);

  const handleConfirm = async () => {
    if (!landlordEmail.trim()) {
      alert('Please enter a landlord email address');
      return;
    }
    
    try {
      // Send landlord report email
      const { data, error } = await supabase.functions.invoke('send-landlord-report', {
        body: {
          request_id: request?.id,
          landlord_email: landlordEmail.trim(),
          options: reportOptions
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Function response:', data);

      toast.success('Report emailed to landlord successfully');
      
      // Call the original onConfirm with the report options
      await onConfirm(notes, landlordEmail, reportOptions);
      
      setNotes('');
      setLandlordEmail('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email to landlord');
    }
  };

  const handleCancel = () => {
    setNotes('');
    setLandlordEmail('');
    onOpenChange(false);
  };

  const handleReportOptionChange = (option: string) => {
    setReportOptions(prev => ({
      ...prev,
      [option]: !prev[option as keyof typeof prev]
    }));
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

          {/* Landlord Email Section */}
          <div className="space-y-2">
            <Label htmlFor="landlord-email">Landlord Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="landlord-email"
              type="email"
              placeholder="Enter landlord's email address"
              value={landlordEmail}
              onChange={(e) => setLandlordEmail(e.target.value)}
              required
            />
            {property?.practice_leader_email || property?.email ? (
              <p className="text-xs text-muted-foreground">
                Default email from property: {property.practice_leader_email || property.email}
              </p>
            ) : null}
          </div>

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

          {/* Report Options Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Content to Include</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-summary"
                    checked={reportOptions.summary}
                    onCheckedChange={() => handleReportOptionChange('summary')}
                  />
                  <Label htmlFor="include-summary" className="text-sm">Request Summary</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-property"
                    checked={reportOptions.property}
                    onCheckedChange={() => handleReportOptionChange('property')}
                  />
                  <Label htmlFor="include-property" className="text-sm">Property Details</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-issue"
                    checked={reportOptions.issue}
                    onCheckedChange={() => handleReportOptionChange('issue')}
                  />
                  <Label htmlFor="include-issue" className="text-sm">Issue Details</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-photos"
                    checked={reportOptions.photos}
                    onCheckedChange={() => handleReportOptionChange('photos')}
                  />
                  <Label htmlFor="include-photos" className="text-sm">Photos</Label>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox 
                    id="include-practice-leader"
                    checked={reportOptions.practiceLeader}
                    onCheckedChange={() => handleReportOptionChange('practiceLeader')}
                  />
                  <Label htmlFor="include-practice-leader" className="text-sm">Practice Leader Details</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Information */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> An email notification will be sent to <strong>{landlordEmail || 'the specified landlord'}</strong> with the above information
              and a link to view the full request details.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Sending Report...' : 'Send Report & Assign to Landlord'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};