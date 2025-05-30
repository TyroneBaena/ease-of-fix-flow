
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
    if (files.length === 0) return [];

    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `maintenance-attachments/${fileName}`;

        console.log('Uploading file:', file.name, 'to path:', filePath);

        const { data, error } = await supabase.storage
          .from('maintenance-files')
          .upload(filePath, file);

        if (error) {
          console.error('Error uploading file:', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        console.log('File uploaded successfully:', data);

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('maintenance-files')
          .getPublicUrl(filePath);

        console.log('Public URL generated:', urlData.publicUrl);

        uploadedFiles.push({
          url: urlData.publicUrl,
          name: file.name,
          type: file.type
        });
      }

      console.log('All files uploaded:', uploadedFiles);
      return uploadedFiles;
    } catch (error) {
      console.error('Error in file upload process:', error);
      toast.error('Failed to upload files');
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFiles,
    isUploading
  };
};
