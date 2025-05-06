
import { supabase } from '@/lib/supabase';

export const updateJobProgressStatus = async (
  requestId: string, 
  progress: number, 
  notes?: string,
  completionPhotos?: Array<{ url: string }>
) => {
  const updates: any = {
    completion_percentage: progress,
    updated_at: new Date().toISOString()
  };

  if (notes) {
    const { data: currentRequest } = await supabase
      .from('maintenance_requests')
      .select('progress_notes')
      .eq('id', requestId)
      .single();

    // Fix the iteration issue by ensuring we have a valid array
    let existingNotes: string[] = [];
    if (currentRequest?.progress_notes && Array.isArray(currentRequest.progress_notes)) {
      existingNotes = currentRequest.progress_notes;
    }

    updates.progress_notes = [
      ...existingNotes,
      {
        note: notes,
        timestamp: new Date().toISOString()
      }
    ];
  }

  if (completionPhotos && completionPhotos.length > 0) {
    const { data: currentPhotos } = await supabase
      .from('maintenance_requests')
      .select('completion_photos')
      .eq('id', requestId)
      .single();
    
    // Ensure we have a valid array for completion_photos and format correctly
    let existingPhotos: Array<{ url: string }> = [];
    if (currentPhotos?.completion_photos) {
      // Make sure each item is properly formatted with a url property
      if (Array.isArray(currentPhotos.completion_photos)) {
        existingPhotos = currentPhotos.completion_photos.map(photo => {
          // If it's already an object with a url property, use it directly
          if (typeof photo === 'object' && photo !== null && 'url' in photo) {
            return photo as { url: string };
          }
          // If it's a string, assume it's the URL
          else if (typeof photo === 'string') {
            return { url: photo };
          }
          // For any other case, try to convert to string and use as URL
          else {
            return { url: String(photo) };
          }
        });
      }
    }
    
    updates.completion_photos = [
      ...existingPhotos,
      ...completionPhotos
    ];
  }

  if (progress === 100) {
    updates.status = 'completed';
  }

  const { error } = await supabase
    .from('maintenance_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) throw error;
};
