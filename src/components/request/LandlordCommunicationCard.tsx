import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logActivity } from '@/contexts/contractor/operations/helpers/activityHelpers';
import { LandlordReportDialog } from './LandlordReportDialog';
import { MaintenanceRequest } from '@/types/maintenance';
import { Mail, FileText, User, Download, Send, UserMinus } from 'lucide-react';

interface LandlordCommunicationCardProps {
  request: MaintenanceRequest;
  onRefreshData?: () => void;
}

interface ReportOptions {
  summary: boolean;
  property: boolean;
  issue: boolean;
  photos: boolean;
  practiceLeader: boolean;
}

export const LandlordCommunicationCard: React.FC<LandlordCommunicationCardProps> = ({
  request,
  onRefreshData,
}) => {
  const { currentUser } = useUserContext();
  const [landlordEmail, setLandlordEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [property, setProperty] = useState<any>(null);
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    summary: true,
    property: true,
    issue: true,
    photos: true,
    practiceLeader: false,
  });

  const isAssignedToLandlord = (request as any).assigned_to_landlord ?? false;
  const landlordNotes = (request as any).landlord_notes || '';

  // Fetch property and landlord data
  useEffect(() => {
    const fetchPropertyAndLandlord = async () => {
      if (!request.propertyId) return;

      try {
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            landlords!landlord_id (
              id,
              name,
              email,
              phone,
              office_address,
              postal_address
            )
          `)
          .eq('id', request.propertyId)
          .single();

        if (error) {
          console.error('Error fetching property:', error);
          return;
        }

        setProperty(data);
        setLandlord(data?.landlords || null);

        // Set default email from landlord or property
        const defaultEmail = data?.landlords?.email || data?.email || '';
        setLandlordEmail(defaultEmail);
      } catch (err) {
        console.error('Error fetching property:', err);
      }
    };

    fetchPropertyAndLandlord();
  }, [request.propertyId]);

  // Initialize notes from existing landlord notes
  useEffect(() => {
    if (landlordNotes) {
      setNotes(landlordNotes);
    }
  }, [landlordNotes]);

  const handleReportOptionChange = (option: keyof ReportOptions) => {
    setReportOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const handleSendReport = async () => {
    if (!landlordEmail.trim()) {
      toast.error('Please enter a landlord email address');
      return;
    }

    if (!request.id) {
      toast.error('Invalid request - missing ID');
      return;
    }

    setIsSendingEmail(true);
    try {
      console.log('[LandlordReport] Invoking send-landlord-report with:', {
        request_id: request.id,
        landlord_email: landlordEmail.trim(),
        options: reportOptions,
      });

      const { data, error } = await supabase.functions.invoke('send-landlord-report', {
        body: {
          request_id: request.id,
          landlord_email: landlordEmail.trim(),
          options: reportOptions,
        },
      });

      console.log('[LandlordReport] Response:', { data, error });

      // Check for invoke error
      if (error) {
        console.error('[LandlordReport] Invoke error:', error);
        throw error;
      }

      // Check for null/empty response (silent failure)
      if (!data) {
        console.error('[LandlordReport] No response data received');
        throw new Error('No response from server - email may not have been sent');
      }

      // Check for error in response body
      if (data.error) {
        console.error('[LandlordReport] Response error:', data.error);
        throw new Error(data.error);
      }

      // Verify explicit success flag
      if (!data.success) {
        console.error('[LandlordReport] Send failed - no success flag:', data);
        throw new Error(data.message || 'Failed to send email to landlord');
      }

      console.log('[LandlordReport] Email sent successfully, ID:', data.emailId);
      toast.success('Report sent successfully', {
        description: `Email sent to ${data.email || landlordEmail}. Check spam folder if not received.`
      });
      
      // Log activity
      if (currentUser) {
        await logActivity({
          requestId: request.id,
          actionType: 'landlord_report_sent',
          description: `Report sent to landlord (${landlordEmail})`,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          metadata: { landlordEmail, reportOptions, emailId: data.emailId },
        });
      }
    } catch (error: any) {
      console.error('[LandlordReport] Error sending email:', error);
      toast.error('Failed to send email to landlord', {
        description: error.message || 'Unknown error occurred'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAssignToLandlord = async () => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }

    if (!landlordEmail.trim()) {
      toast.error('Please enter a landlord email address');
      return;
    }

    setLoading(true);
    try {
      console.log('[LandlordReport] Invoking send-landlord-report for assignment with:', {
        request_id: request.id,
        landlord_email: landlordEmail.trim(),
        options: reportOptions,
      });

      // First send the email report
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-landlord-report', {
        body: {
          request_id: request.id,
          landlord_email: landlordEmail.trim(),
          options: reportOptions,
        },
      });

      console.log('[LandlordReport] Assignment email response:', { emailData, emailError });

      // Check for invoke error
      if (emailError) {
        console.error('[LandlordReport] Email invoke error:', emailError);
        throw emailError;
      }

      // Check for null/empty response (silent failure)
      if (!emailData) {
        console.error('[LandlordReport] No email response data received');
        throw new Error('No response from server - email may not have been sent');
      }

      // Check for error in response body
      if (emailData.error) {
        console.error('[LandlordReport] Email response error:', emailData.error);
        throw new Error(emailData.error);
      }

      // Verify explicit success flag
      if (!emailData.success) {
        console.error('[LandlordReport] Email send failed - no success flag:', emailData);
        throw new Error(emailData.message || 'Failed to send email to landlord');
      }

      console.log('[LandlordReport] Email sent successfully, ID:', emailData.emailId);

      // Then update the database
      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update({
          assigned_to_landlord: true,
          landlord_notes: notes || null,
          landlord_assigned_at: new Date().toISOString(),
          landlord_assigned_by: currentUser.id,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Log activity
      await logActivity({
        requestId: request.id,
        actionType: 'landlord_assignment',
        description: `Request assigned to landlord (${landlordEmail})`,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        metadata: { notes, landlordEmail, reportOptions, emailId: emailData.emailId },
      });

      toast.success('Assigned to landlord and report sent successfully', {
        description: `Email sent to ${emailData.email || landlordEmail}`
      });
      onRefreshData?.();
    } catch (error: any) {
      console.error('[LandlordReport] Assign to landlord failed:', error);
      toast.error('Failed to assign to landlord', {
        description: error.message || 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!currentUser) {
      toast.error('You must be logged in');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          assigned_to_landlord: false,
          landlord_assigned_at: null,
          landlord_assigned_by: null,
        })
        .eq('id', request.id);

      if (error) throw error;

      await logActivity({
        requestId: request.id,
        actionType: 'landlord_unassigned',
        description: 'Request unassigned from landlord',
        actorName: currentUser.name,
        actorRole: currentUser.role,
      });

      toast.success('Unassigned from landlord');
      onRefreshData?.();
    } catch (error) {
      console.error('Unassign landlord failed', error);
      toast.error('Failed to unassign landlord');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPdfPreview = () => {
    setReportDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Landlord Communication
            {isAssignedToLandlord && (
              <Badge variant="secondary" className="ml-auto">
                Assigned
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assignment Status */}
          {isAssignedToLandlord && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                This request is currently assigned to the landlord.
              </p>
              {landlordNotes && (
                <p className="mt-2">
                  <span className="font-medium">Notes:</span> {landlordNotes}
                </p>
              )}
            </div>
          )}

          {/* Landlord Email */}
          <div className="space-y-2">
            <Label htmlFor="landlord-email" className="text-sm font-medium">
              Landlord Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="landlord-email"
              type="email"
              placeholder="Enter landlord's email address"
              value={landlordEmail}
              onChange={(e) => setLandlordEmail(e.target.value)}
              disabled={loading || isSendingEmail}
            />
            {landlord?.email ? (
              <p className="text-xs text-muted-foreground">
                Landlord: {landlord.name} ({landlord.email})
              </p>
            ) : property?.email ? (
              <p className="text-xs text-muted-foreground">
                Property email: {property.email}
              </p>
            ) : null}
          </div>

          {/* Notes */}
          {!isAssignedToLandlord && (
            <div className="space-y-2">
              <Label htmlFor="landlord-notes" className="text-sm font-medium">
                Notes for Landlord (Optional)
              </Label>
              <Textarea
                id="landlord-notes"
                placeholder="Add any additional context for the landlord..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={loading || isSendingEmail}
              />
            </div>
          )}

          <Separator />

          {/* Report Content Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Report Content</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={reportOptions.summary}
                  onCheckedChange={() => handleReportOptionChange('summary')}
                  disabled={loading || isSendingEmail}
                />
                <span>Request Summary</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={reportOptions.property}
                  onCheckedChange={() => handleReportOptionChange('property')}
                  disabled={loading || isSendingEmail}
                />
                <span>Property Details</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={reportOptions.issue}
                  onCheckedChange={() => handleReportOptionChange('issue')}
                  disabled={loading || isSendingEmail}
                />
                <span>Issue Details</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={reportOptions.photos}
                  onCheckedChange={() => handleReportOptionChange('photos')}
                  disabled={loading || isSendingEmail}
                />
                <span>Photos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer col-span-2">
                <Checkbox
                  checked={reportOptions.practiceLeader}
                  onCheckedChange={() => handleReportOptionChange('practiceLeader')}
                  disabled={loading || isSendingEmail}
                />
                <span>Practice Leader Details</span>
              </label>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Send Report Only */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSendReport}
              disabled={loading || isSendingEmail || !landlordEmail.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSendingEmail ? 'Sending...' : 'Send Report'}
            </Button>

            {/* Download PDF */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOpenPdfPreview}
              disabled={loading || isSendingEmail}
            >
              <Download className="h-4 w-4 mr-2" />
              Preview & Download PDF
            </Button>

            {/* Assign/Unassign */}
            {isAssignedToLandlord ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleUnassign}
                disabled={loading || isSendingEmail}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                {loading ? 'Unassigning...' : 'Unassign Landlord'}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleAssignToLandlord}
                disabled={loading || isSendingEmail || !landlordEmail.trim()}
              >
                <Mail className="h-4 w-4 mr-2" />
                {loading ? 'Assigning...' : 'Assign & Send Report'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview Dialog */}
      <LandlordReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        request={request}
        options={reportOptions}
      />
    </>
  );
};
