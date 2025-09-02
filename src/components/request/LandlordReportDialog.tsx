

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaintenanceRequest } from '@/types/maintenance';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface LandlordReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
  options: { summary: boolean; property: boolean; issue: boolean; photos: boolean; practiceLeader?: boolean };
}

export const LandlordReportDialog: React.FC<LandlordReportDialogProps> = ({ open, onOpenChange, request, options }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [property, setProperty] = useState<{ name: string; address: string; practice_leader?: string; practice_leader_email?: string; practice_leader_phone?: string } | null>(null);
  const [isEmailingSent, setIsEmailingSent] = useState(false);
  const [landlordEmail, setLandlordEmail] = useState('');

  useEffect(() => {
    const loadProperty = async () => {
      try {
        // Fix property ID access - use propertyId consistently with MaintenanceRequest type
        const propertyId = (request as any).propertyId || (request as any).property_id;
        if (!propertyId) {
          console.warn('No property ID found in request');
          return;
        }
        const { data, error } = await supabase
          .from('properties')
          .select('name, address, practice_leader, practice_leader_email, practice_leader_phone')
          .eq('id', propertyId)
          .single();
        if (!error && data) {
          setProperty(data as any);
          // Set default email when property loads
          const defaultEmail = data.practice_leader_email || '';
          setLandlordEmail(defaultEmail);
        } else {
          console.warn('Failed to load property:', error);
        }
      } catch (e) {
        console.error('Error loading property for report:', e);
        toast.error('Failed to load property information');
      }
    };
    if (open) {
      loadProperty();
    } else {
      // Reset state when dialog closes
      setProperty(null);
      setLandlordEmail('');
    }
  }, [open, request]);

  const handleDownload = async () => {
    if (!contentRef.current) return;

    const canvas = await html2canvas(contentRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 0;
    let remainingHeight = imgHeight;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);

    while (remainingHeight > pageHeight) {
      position = position - pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;
    }

    pdf.save(`request-report-${request.id}.pdf`);
  };

  const handleEmailToLandlord = async () => {
    // Validate email input
    if (!landlordEmail.trim()) {
      toast.error('Please enter a landlord email address');
      return;
    }

    if (!request.id) {
      toast.error('Invalid request - missing ID');
      return;
    }

    setIsEmailingSent(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-landlord-report', {
        body: {
          request_id: request.id,
          landlord_email: landlordEmail.trim(),
          options: options
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      toast.success('Report emailed to landlord successfully');
      console.log('Email sent successfully:', data);
      
      // Close dialog on success
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email to landlord. Please try again.');
    } finally {
      setIsEmailingSent(false);
    }
  };

  const attachments = Array.isArray(request.attachments) ? request.attachments : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Request Report Preview</DialogTitle>
          <DialogDescription>
            Review the report tailored to this request. You can download it as a PDF or email it to the landlord.
          </DialogDescription>
        </DialogHeader>

        {/* Email Input Section */}
        <div className="space-y-2 border-b pb-4">
          <Label htmlFor="landlord-email">Landlord Email Address</Label>
          <Input
            id="landlord-email"
            type="email"
            placeholder="Enter landlord's email address"
            value={landlordEmail}
            onChange={(e) => setLandlordEmail(e.target.value)}
            disabled={isEmailingSent}
          />
          {property?.practice_leader_email && (
            <p className="text-xs text-muted-foreground">
              Default: {property.practice_leader_email}
            </p>
          )}
        </div>

        <div ref={contentRef} className="space-y-4">
          {options.summary && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Request Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="font-medium">Request ID:</span> {request.id}</div>
              <div><span className="font-medium">Created:</span> {request.createdAt}</div>
              <div><span className="font-medium">Title:</span> {request.title}</div>
              <div><span className="font-medium">Status:</span> {request.status}</div>
              <div><span className="font-medium">Priority:</span> {request.priority}</div>
              <div><span className="font-medium">Location:</span> {request.location}</div>
              {request.reportDate && (
                <div><span className="font-medium">Report Date:</span> {request.reportDate}</div>
              )}
              {request.site && (
                <div><span className="font-medium">Site:</span> {request.site}</div>
              )}
              {request.submittedBy && (
                <div><span className="font-medium">Submitted By:</span> {request.submittedBy}</div>
              )}
            </div>
          </Card>
          )}

          {property && options.property && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Property</h3>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Name:</span> {property.name}</div>
                <div><span className="font-medium">Address:</span> {property.address}</div>
                {options.practiceLeader && property.practice_leader && (<div><span className="font-medium">Practice Leader:</span> {property.practice_leader}</div>)}
                {options.practiceLeader && property.practice_leader_email && (<div><span className="font-medium">Email:</span> {property.practice_leader_email}</div>)}
                {options.practiceLeader && property.practice_leader_phone && (<div><span className="font-medium">Phone:</span> {property.practice_leader_phone}</div>)}
              </div>
            </Card>
          )}

          {options.issue && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Issue Details</h3>
            <div className="space-y-2 text-sm">
              {request.issueNature && (
                <p><span className="font-medium">Issue Nature:</span> {request.issueNature}</p>
              )}
              {request.description && (
                <p><span className="font-medium">Description:</span> {request.description}</p>
              )}
              {request.explanation && (
                <p><span className="font-medium">Explanation:</span> {request.explanation}</p>
              )}
              {request.attemptedFix && (
                <p><span className="font-medium">Attempted Fix:</span> {request.attemptedFix}</p>
              )}
            </div>
          </Card>
          )}

          {options.photos && attachments.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-3">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {attachments.map((att, idx) => (
                  <div key={idx} className="border rounded overflow-hidden">
                    <img
                      src={(att as any).url}
                      alt={`Request ${request.id} photo ${idx + 1}`}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isEmailingSent}>
            Close
          </Button>
          <Button 
            variant="outline" 
            onClick={handleEmailToLandlord}
            disabled={isEmailingSent || !landlordEmail.trim()}
          >
            {isEmailingSent ? 'Sending...' : 'Email to Landlord'}
          </Button>
          <Button onClick={handleDownload} disabled={isEmailingSent}>
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
