
import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaintenanceRequest } from '@/types/maintenance';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LandlordReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest;
}

export const LandlordReportDialog: React.FC<LandlordReportDialogProps> = ({ open, onOpenChange, request }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!contentRef.current) return;

    const canvas = await html2canvas(contentRef.current, { scale: 2, backgroundColor: '#ffffff' });
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

    pdf.save(`landlord-report-${request.id}.pdf`);
  };

  const attachments = Array.isArray(request.attachments) ? request.attachments : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Landlord Report Preview</DialogTitle>
          <DialogDescription>
            Review the report. You can download it as a PDF.
          </DialogDescription>
        </DialogHeader>

        <div ref={contentRef} className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Request Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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

          {attachments.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-3">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {attachments.map((att, idx) => (
                  <div key={idx} className="border rounded overflow-hidden">
                    <img
                      src={(att as any).url}
                      alt={`Maintenance photo ${idx + 1}`}
                      className="w-full h-40 object-cover"
                      loading="lazy"
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
