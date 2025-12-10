import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PropertyNote } from '@/types/notes';
import { NotesTable } from './NotesTable';
import { NoteFormDialog } from './NoteFormDialog';
import { DeleteNoteDialog } from './DeleteNoteDialog';

interface PropertyNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  notes: PropertyNote[];
  loading: boolean;
  onAddNote: (note: { noteType: string; title: string; content: string }) => Promise<void>;
  onUpdateNote: (id: string, updates: { noteType: string; title: string; content: string }) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export function PropertyNotesDialog({
  open,
  onOpenChange,
  propertyId,
  notes,
  loading,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: PropertyNotesDialogProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PropertyNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<PropertyNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (note: PropertyNote) => {
    setEditingNote(note);
    setFormDialogOpen(true);
  };

  const handleDelete = (note: PropertyNote) => {
    setDeletingNote(note);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: { noteType: string; title: string; content: string }) => {
    if (editingNote) {
      await onUpdateNote(editingNote.id, data);
    } else {
      await onAddNote(data);
    }
    setEditingNote(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingNote) return;
    
    setIsDeleting(true);
    try {
      await onDeleteNote(deletingNote.id);
      setDeleteDialogOpen(false);
      setDeletingNote(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormDialogClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) setEditingNote(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Property Notes</DialogTitle>
              <Button onClick={() => setFormDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <NotesTable
                notes={notes}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NoteFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogClose}
        onSubmit={handleFormSubmit}
        editingNote={editingNote}
      />

      <DeleteNoteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        note={deletingNote}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
