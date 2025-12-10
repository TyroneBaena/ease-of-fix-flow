import React from 'react';
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
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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
  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No notes yet. Add your first note to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell">Created By</TableHead>
          <TableHead className="hidden sm:table-cell w-[120px]">Date</TableHead>
          <TableHead className="w-[100px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.id}>
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
        ))}
      </TableBody>
    </Table>
  );
}
