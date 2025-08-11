

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MaintenanceRequest } from '@/types/maintenance';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';

interface LandlordReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
}

export const LandlordReportDialog: React.FC<LandlordReportDialogProps> = ({ open, onOpenChange, request }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [property, setProperty] = useState<{ name: string; address: string; practice_leader?: string; practice_leader_email?: string; practice_leader_phone?: string } | null>(null);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeProperty, setIncludeProperty] = useState(true);
  const [includeIssue, setIncludeIssue] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const propertyId = (request as any).propertyId || (request as any).property_id;
        if (!propertyId) return;
        const { data, error } = await supabase
          .from('properties')
          .select('name, address, practice_leader, practice_leader_email, practice_leader_phone')
          .eq('id', propertyId)
          .single();
        if (!error) setProperty(data as any);
      } catch (e) {
        console.warn('Failed to load property for report', e);
      }
    };
    if (open) loadProperty();
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

  const attachments = Array.isArray(request.attachments) ? request.attachments : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Request Report Preview</DialogTitle>
          <DialogDescription>
            Review the report tailored to this request. You can download it as a PDF.
          </DialogDescription>
        </DialogHeader>

        {/* Report options (not included in PDF) */}
        <Card className="p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2">Include in report</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={includeSummary} onCheckedChange={(v) => setIncludeSummary(!!v)} />
              <span>Request Summary</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={includeProperty} onCheckedChange={(v) => setIncludeProperty(!!v)} />
              <span>Property Details</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={includeIssue} onCheckedChange={(v) => setIncludeIssue(!!v)} />
              <span>Issue Details</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={includePhotos} onCheckedChange={(v) => setIncludePhotos(!!v)} />
              <span>Photos</span>
            </label>
          </div>
        </Card>

        <div ref={contentRef} className="space-y-4">
          {includeSummary && (
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

          {property && includeProperty && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Property</h3>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Name:</span> {property.name}</div>
                <div><span className="font-medium">Address:</span> {property.address}</div>
                {property.practice_leader && (<div><span className="font-medium">Practice Leader:</span> {property.practice_leader}</div>)}
                {property.practice_leader_email && (<div><span className="font-medium">Email:</span> {property.practice_leader_email}</div>)}
                {property.practice_leader_phone && (<div><span className="font-medium">Phone:</span> {property.practice_leader_phone}</div>)}
              </div>
            </Card>
          )}

          {includeIssue && (
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

          {includePhotos && attachments.length > 0 && (
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownload}>Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
