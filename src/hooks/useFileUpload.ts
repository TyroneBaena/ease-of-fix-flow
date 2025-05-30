
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
    console.log('useFileUpload - uploadFiles called with:', files.length, 'files');
    
    if (files.length === 0) {
      console.log('useFileUpload - No files to upload, returning empty array');
      return [];
    }

    setIsUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      console.log('useFileUpload - Starting file upload process');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`useFileUpload - Processing file ${i + 1}/${files.length}:`, {
          name: file.name,
          size: file.size,
          type: file.type
        });

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `maintenance-attachments/${fileName}`;

        console.log('useFileUpload - Upload details:', {
          originalName: file.name,
          generatedFileName: fileName,
          filePath: filePath,
          fileSize: file.size
        });

        const { data, error } = await supabase.storage
          .from('maintenance-files')
          .upload(filePath, file);

        if (error) {
          console.error('useFileUpload - Upload error for file:', file.name, error);
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
          continue;
        }

        console.log('useFileUpload - File uploaded successfully:', {
          fileName: file.name,
          uploadData: data,
          uploadPath: data?.path
        });

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('maintenance-files')
          .getPublicUrl(filePath);

        console.log('useFileUpload - Public URL generated:', {
          fileName: file.name,
          publicUrl: urlData.publicUrl,
          fullUrlData: urlData
        });

        const uploadedFile = {
          url: urlData.publicUrl,
          name: file.name,
          type: file.type
        };

        console.log('useFileUpload - Created uploaded file object:', uploadedFile);
        uploadedFiles.push(uploadedFile);
      }

      console.log('useFileUpload - All files processed. Final uploadedFiles array:', uploadedFiles);
      console.log('useFileUpload - Upload summary:', {
        totalFiles: files.length,
        successfulUploads: uploadedFiles.length,
        failedUploads: files.length - uploadedFiles.length
      });

      if (uploadedFiles.length > 0) {
        toast.success(`Successfully uploaded ${uploadedFiles.length} file(s)`);
      }

      return uploadedFiles;
    } catch (error) {
      console.error('useFileUpload - Critical error in upload process:', error);
      toast.error('Failed to upload files due to unexpected error');
      return [];
    } finally {
      console.log('useFileUpload - Setting isUploading to false');
      setIsUploading(false);
    }
  };

  return {
    uploadFiles,
    isUploading
  };
};
