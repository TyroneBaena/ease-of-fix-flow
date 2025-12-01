import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFileUpload } from './useFileUpload';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface Attachment {
  url: string;
  name: string;
  type: string;
}

export const useAddAttachments = () => {
  const [isAdding, setIsAdding] = useState(false);
  const { uploadFiles, isUploading } = useFileUpload();

  const addAttachments = async (
    requestId: string, 
    files: File[], 
    existingAttachments: Attachment[] | null
  ): Promise<Attachment[] | null> => {
    setIsAdding(true);
    try {
      // Upload new files to storage
      const uploadedFiles = await uploadFiles(files);
      if (uploadedFiles.length === 0) {
        throw new Error('No files were uploaded');
      }

      // Merge with existing attachments
      const currentAttachments = existingAttachments || [];
      const combinedAttachments = [...currentAttachments, ...uploadedFiles];

      // Update the maintenance request
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ 
          attachments: combinedAttachments as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(`Added ${uploadedFiles.length} attachment(s)`);
      return combinedAttachments;
    } catch (error) {
      console.error('Error adding attachments:', error);
      toast.error('Failed to add attachments');
      return null;
    } finally {
      setIsAdding(false);
    }
  };

  return { addAttachments, isAdding, isUploading };
};
