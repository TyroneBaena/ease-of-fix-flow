
import { supabase } from '@/lib/supabase';

export const updateJobProgressStatus = async (
  requestId: string, 
  progress: number, 
  notes?: string
) => {
  const updates: any = {
    completion_percentage: progress
  };

  if (notes) {
    const { data: currentRequest } = await supabase
      .from('maintenance_requests')
      .select('progress_notes')
      .eq('id', requestId)
      .single();

    updates.progress_notes = [
      ...(currentRequest?.progress_notes || []),
      notes
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

