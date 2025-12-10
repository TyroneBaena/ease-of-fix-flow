import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PropertyNote } from '@/types/notes';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface NoteExportMenuProps {
  note: PropertyNote;
  propertyName: string;
}

export function NoteExportMenu({ note, propertyName }: NoteExportMenuProps) {
  const [exporting, setExporting] = useState(false);

  const attachments = Array.isArray(note.attachments) ? note.attachments : [];

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const data = [{
        Type: note.noteType,
        Title: note.title,
        Content: note.content,
        'Created By': note.createdByName || 'Unknown',
        'Created Date': format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm'),
        'Attachments': attachments.length,
      }];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Note');

      const colWidths = [
        { wch: 20 },
        { wch: 30 },
        { wch: 50 },
        { wch: 20 },
        { wch: 18 },
        { wch: 12 },
      ];
      worksheet['!cols'] = colWidths;

      const fileName = `${propertyName.replace(/[^a-z0-9]/gi, '_')}_note_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Note exported to Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export note');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Property Note - ${propertyName}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(14, yPosition - 4, doc.getTextWidth(note.noteType) + 6, 7, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(note.noteType, 17, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;

      doc.setFont('helvetica', 'bold');
      doc.text(note.title, 14, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(note.content, pageWidth - 28);
      doc.text(contentLines, 14, yPosition);
      yPosition += contentLines.length * 5;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const metadata = `By ${note.createdByName || 'Unknown'} • ${format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}`;
      if (attachments.length > 0) {
        doc.text(`${metadata} • ${attachments.length} attachment(s)`, 14, yPosition);
      } else {
        doc.text(metadata, 14, yPosition);
      }

      const fileName = `${propertyName.replace(/[^a-z0-9]/gi, '_')}_note_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('Note exported to PDF');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export note');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={exporting} aria-label="Export note">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
