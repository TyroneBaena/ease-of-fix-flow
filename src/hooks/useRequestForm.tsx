
import { useState, ChangeEvent } from 'react';

interface FormState {
  title: string;
  description: string;
  category: string;
  location: string;
  priority: string;
  propertyId: string;
}

export const useRequestForm = () => {
  const [formState, setFormState] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    location: '',
    priority: 'medium',
    propertyId: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormState = (field: keyof FormState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles([...files, ...selectedFiles]);
      
      // Generate preview URLs
      const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    const newPreviewUrls = [...previewUrls];
    URL.revokeObjectURL(newPreviewUrls[index]);
    newPreviewUrls.splice(index, 1);
    setPreviewUrls(newPreviewUrls);
  };

  return {
    formState,
    updateFormState,
    files,
    previewUrls,
    handleFileChange,
    removeFile,
    isSubmitting,
    setIsSubmitting
  };
};
