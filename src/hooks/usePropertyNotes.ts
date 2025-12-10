import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PropertyNote } from '@/types/notes';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { toast } from '@/lib/toast';

interface UsePropertyNotesResult {
  notes: PropertyNote[];
  loading: boolean;
  error: string | null;
  addNote: (note: Omit<PropertyNote, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'organizationId' | 'createdByName'>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Pick<PropertyNote, 'noteType' | 'title' | 'content'>>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

export function usePropertyNotes(propertyId: string): UsePropertyNotesResult {
  const [notes, setNotes] = useState<PropertyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useUserContext();

  const fetchNotes = useCallback(async () => {
    if (!propertyId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('property_notes')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedNotes: PropertyNote[] = (data || []).map(note => ({
        id: note.id,
        propertyId: note.property_id,
        organizationId: note.organization_id,
        userId: note.user_id,
        noteType: note.note_type,
        title: note.title,
        content: note.content,
        createdByName: note.created_by_name,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));

      setNotes(transformedNotes);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(async (note: Omit<PropertyNote, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'organizationId' | 'createdByName'>) => {
    if (!currentUser) {
      toast.error('You must be logged in to add notes');
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('property_notes')
        .insert({
          property_id: note.propertyId,
          organization_id: currentUser.organization_id,
          user_id: currentUser.id,
          note_type: note.noteType,
          title: note.title,
          content: note.content,
          created_by_name: currentUser.name,
        });

      if (insertError) throw insertError;

      toast.success('Note added successfully');
      await fetchNotes();
    } catch (err) {
      console.error('Error adding note:', err);
      toast.error('Failed to add note');
      throw err;
    }
  }, [currentUser, fetchNotes]);

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<PropertyNote, 'noteType' | 'title' | 'content'>>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.noteType !== undefined) updateData.note_type = updates.noteType;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;

      const { error: updateError } = await supabase
        .from('property_notes')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Note updated successfully');
      await fetchNotes();
    } catch (err) {
      console.error('Error updating note:', err);
      toast.error('Failed to update note');
      throw err;
    }
  }, [fetchNotes]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('property_notes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Note deleted successfully');
      await fetchNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
      toast.error('Failed to delete note');
      throw err;
    }
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes: fetchNotes,
  };
}
