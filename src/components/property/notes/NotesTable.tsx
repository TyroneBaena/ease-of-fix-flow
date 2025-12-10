import React, { useState } from 'react';
import { PropertyNote } from '@/types/notes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Pencil, Trash2, ChevronDown, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { NoteAttachments } from './NoteAttachments';

interface NotesTableProps {
  notes: PropertyNote[];
  onEdit: (note: PropertyNote) => void;
  onDelete: (note: PropertyNote) => void;
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

export function NotesTable({ notes, onEdit, onDelete }: NotesTableProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No notes yet. Add your first note to get started.
      </div>
    );
  }

  const toggleExpanded = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell w-[80px]">Files</TableHead>
          <TableHead className="hidden md:table-cell">Created By</TableHead>
          <TableHead className="hidden sm:table-cell w-[120px]">Date</TableHead>
          <TableHead className="w-[100px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes.map((note) => {
          const hasAttachments = note.attachments && note.attachments.length > 0;
          const isExpanded = expandedNotes.has(note.id);

          return (
            <React.Fragment key={note.id}>
              <TableRow>
                <TableCell>
                  <Badge variant={getNoteTypeBadgeVariant(note.noteType)}>
                    {note.noteType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{note.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {note.content}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {hasAttachments && (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(note.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Paperclip className="h-3 w-3" />
                          <span>{note.attachments!.length}</span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {note.createdByName || 'Unknown'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {format(new Date(note.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(note)}
                      aria-label="Edit note"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(note)}
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {hasAttachments && isExpanded && (
                <TableRow>
                  <TableCell colSpan={6} className="bg-muted/30 py-3">
                    <NoteAttachments attachments={note.attachments!} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
