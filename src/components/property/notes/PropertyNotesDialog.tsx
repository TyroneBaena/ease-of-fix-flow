import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PropertyNote, NoteAttachment } from '@/types/notes';
import { NotesTable } from './NotesTable';
import { NoteFormDialog } from './NoteFormDialog';
import { DeleteNoteDialog } from './DeleteNoteDialog';
import { NoteViewDialog } from './NoteViewDialog';
import { NotesFilter } from './NotesFilter';

interface PropertyNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyName: string;
  notes: PropertyNote[];
  loading: boolean;
  onAddNote: (note: { noteType: string; title: string; content: string; attachments?: NoteAttachment[] }) => Promise<void>;
  onUpdateNote: (id: string, updates: { noteType: string; title: string; content: string; attachments?: NoteAttachment[] }) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export function PropertyNotesDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  notes,
  loading,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: PropertyNotesDialogProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PropertyNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<PropertyNote | null>(null);
  const [viewingNote, setViewingNote] = useState<PropertyNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = searchQuery === '' || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || note.noteType === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [notes, searchQuery, typeFilter]);

  const handleView = (note: PropertyNote) => {
    setViewingNote(note);
    setViewDialogOpen(true);
  };

  const handleEdit = (note: PropertyNote) => {
    setEditingNote(note);
    setFormDialogOpen(true);
  };

  const handleDelete = (note: PropertyNote) => {
    setDeletingNote(note);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: { noteType: string; title: string; content: string; attachments?: NoteAttachment[] }) => {
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

  const handleViewDialogClose = (open: boolean) => {
    setViewDialogOpen(open);
    if (!open) setViewingNote(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>Property Notes</DialogTitle>
              <Button onClick={() => setFormDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </DialogHeader>
          <div className="py-2">
            <NotesFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <NotesTable
                notes={filteredNotes}
                propertyName={propertyName}
                onView={handleView}
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
        propertyId={propertyId}
      />

      <NoteViewDialog
        open={viewDialogOpen}
        onOpenChange={handleViewDialogClose}
        note={viewingNote}
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
