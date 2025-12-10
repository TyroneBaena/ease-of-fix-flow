import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropertyNote, NOTE_TYPES, NoteAttachment } from '@/types/notes';
import { AttachmentUploader } from './AttachmentUploader';

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { noteType: string; title: string; content: string; attachments?: NoteAttachment[] }) => Promise<void>;
  editingNote?: PropertyNote | null;
  propertyId: string;
}

export function NoteFormDialog({ open, onOpenChange, onSubmit, editingNote, propertyId }: NoteFormDialogProps) {
  const [noteType, setNoteType] = useState<string>('General');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setNoteType(editingNote.noteType);
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setAttachments(editingNote.attachments || []);
    } else {
      setNoteType('General');
      setTitle('');
      setContent('');
      setAttachments([]);
    }
  }, [editingNote, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ 
        noteType, 
        title: title.trim(), 
        content: content.trim(),
        attachments,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
          <DialogDescription>
            {editingNote 
              ? 'Update the details of this note.' 
              : 'Add a new note for this property.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="noteType">Note Type</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter note content"
                rows={4}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Attachments</Label>
              <AttachmentUploader
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                propertyId={propertyId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}>
              {isSubmitting ? 'Saving...' : editingNote ? 'Update Note' : 'Add Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
