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

interface NotesExportButtonProps {
  notes: PropertyNote[];
  propertyName: string;
}

export function NotesExportButton({ notes, propertyName }: NotesExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const data = notes.map((note) => ({
        Type: note.noteType,
        Title: note.title,
        Content: note.content,
        'Created By': note.createdByName || 'Unknown',
        'Created Date': format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm'),
        'Attachments': note.attachments?.length || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Property Notes');

      // Auto-size columns
      const colWidths = [
        { wch: 20 }, // Type
        { wch: 30 }, // Title
        { wch: 50 }, // Content
        { wch: 20 }, // Created By
        { wch: 18 }, // Created Date
        { wch: 12 }, // Attachments
      ];
      worksheet['!cols'] = colWidths;

      const fileName = `${propertyName.replace(/[^a-z0-9]/gi, '_')}_notes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Notes exported to Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export notes');
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

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Property Notes - ${propertyName}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Notes
      doc.setFontSize(11);
      for (const note of notes) {
        // Check if we need a new page
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }

        // Note type badge
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(59, 130, 246);
        doc.roundedRect(14, yPosition - 4, doc.getTextWidth(note.noteType) + 6, 7, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(note.noteType, 17, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 8;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.text(note.title, 14, yPosition);
        yPosition += 6;

        // Content
        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(note.content, pageWidth - 28);
        doc.text(contentLines, 14, yPosition);
        yPosition += contentLines.length * 5;

        // Metadata
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const metadata = `By ${note.createdByName || 'Unknown'} • ${format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}`;
        if (note.attachments && note.attachments.length > 0) {
          doc.text(`${metadata} • ${note.attachments.length} attachment(s)`, 14, yPosition);
        } else {
          doc.text(metadata, 14, yPosition);
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        yPosition += 12;

        // Separator
        doc.setDrawColor(220, 220, 220);
        doc.line(14, yPosition - 4, pageWidth - 14, yPosition - 4);
        yPosition += 4;
      }

      const fileName = `${propertyName.replace(/[^a-z0-9]/gi, '_')}_notes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('Notes exported to PDF');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export notes');
    } finally {
      setExporting(false);
    }
  };

  if (notes.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
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
