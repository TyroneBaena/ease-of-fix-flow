import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StickyNote, Plus, ChevronRight, Paperclip } from 'lucide-react';
import { usePropertyNotes } from '@/hooks/usePropertyNotes';
import { PropertyNotesDialog } from './notes/PropertyNotesDialog';
import { NoteFormDialog } from './notes/NoteFormDialog';
import { format } from 'date-fns';
import { NoteAttachment } from '@/types/notes';

interface PropertyNotesWidgetProps {
  propertyId: string;
  propertyName: string;
}

export function PropertyNotesWidget({ propertyId, propertyName }: PropertyNotesWidgetProps) {
  const { notes, loading, addNote, updateNote, deleteNote } = usePropertyNotes(propertyId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const recentNotes = notes.slice(0, 3);

  const handleAddNote = async (data: { noteType: string; title: string; content: string; attachments?: NoteAttachment[] }) => {
    await addNote({
      propertyId,
      noteType: data.noteType,
      title: data.title,
      content: data.content,
      attachments: data.attachments,
    });
  };

  const handleUpdateNote = async (id: string, data: { noteType: string; title: string; content: string; attachments?: NoteAttachment[] }) => {
    await updateNote(id, data);
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Property Notes</CardTitle>
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {notes.length}
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentNotes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setQuickAddOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Note
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <div 
                  key={note.id} 
                  className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setDialogOpen(true)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {note.noteType}
                      </Badge>
                      {note.attachments && note.attachments.length > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          {note.attachments.length}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), 'MMM d')}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{note.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              ))}
              
              {notes.length > 3 && (
                <Button 
                  variant="ghost" 
                  className="w-full text-sm"
                  onClick={() => setDialogOpen(true)}
                >
                  View all {notes.length} notes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              
              {notes.length <= 3 && notes.length > 0 && (
                <Button 
                  variant="ghost" 
                  className="w-full text-sm"
                  onClick={() => setDialogOpen(true)}
                >
                  View all notes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PropertyNotesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyId={propertyId}
        propertyName={propertyName}
        notes={notes}
        loading={loading}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
      />

      <NoteFormDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSubmit={handleAddNote}
        propertyId={propertyId}
      />
    </>
  );
}
