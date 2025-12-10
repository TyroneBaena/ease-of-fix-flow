import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PropertyNote } from '@/types/notes';
import { NoteAttachments } from './NoteAttachments';
import { formatFullDateTime } from '@/utils/dateFormatUtils';

interface NoteViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: PropertyNote | null;
}

const getNoteTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case 'Inspection':
      return 'default';
    case 'Maintenance':
      return 'destructive';
    case 'Compliance':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function NoteViewDialog({ open, onOpenChange, note }: NoteViewDialogProps) {
  if (!note) return null;

  const attachments = Array.isArray(note.attachments) ? note.attachments : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant={getNoteTypeBadgeVariant(note.noteType)}>
              {note.noteType}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{note.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            By {note.createdByName || 'Unknown'} • {formatFullDateTime(note.createdAt)}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="whitespace-pre-wrap text-foreground">
            {note.content}
          </div>

          {attachments.length > 0 && (
            <div className="pt-4 border-t">
              <NoteAttachments attachments={attachments} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
