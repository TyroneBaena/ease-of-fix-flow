
import { useState, ChangeEvent } from 'react';

interface FormState {
  propertyId: string;
  isParticipantRelated: boolean;
  participantName: string;
  attemptedFix: string;
  issueNature: string;
  explanation: string;
  location: string;
  reportDate: string;
  submittedBy: string;
  category: string;
  priority: string;
}

export const useRequestForm = () => {
  const [formState, setFormState] = useState<FormState>({
    propertyId: '',
    isParticipantRelated: false,
    participantName: '',
    attemptedFix: '',
    issueNature: '',
    explanation: '',
    location: '',
    reportDate: '',
    submittedBy: '',
    category: '',
    priority: ''
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormState = (field: keyof FormState, value: any) => {
    console.log('useRequestForm - updateFormState called:', { field, value });
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    console.log('useRequestForm - handleFileChange called');
    console.log('useRequestForm - event.target.files:', event.target.files);
    
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      console.log('useRequestForm - selectedFiles:', selectedFiles);
      console.log('useRequestForm - current files array:', files);
      
      // Limit to 10 files total
      if (files.length + selectedFiles.length > 10) {
        console.log('useRequestForm - File limit exceeded');
        alert('You can upload a maximum of 10 files');
        return;
      }
      
      const newFiles = [...files, ...selectedFiles];
      console.log('useRequestForm - Setting new files array:', newFiles);
      setFiles(newFiles);
      
      // Generate preview URLs
      const newPreviewUrls = selectedFiles.map(file => {
        const url = URL.createObjectURL(file);
        console.log('useRequestForm - Generated preview URL for', file.name, ':', url);
        return url;
      });
      
      const allPreviewUrls = [...previewUrls, ...newPreviewUrls];
      console.log('useRequestForm - Setting new preview URLs:', allPreviewUrls);
      setPreviewUrls(allPreviewUrls);
    }
  };

  const removeFile = (index: number) => {
    console.log('useRequestForm - removeFile called for index:', index);
    console.log('useRequestForm - Current files before removal:', files);
    console.log('useRequestForm - Current preview URLs before removal:', previewUrls);
    
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    const newPreviewUrls = [...previewUrls];
    URL.revokeObjectURL(newPreviewUrls[index]);
    newPreviewUrls.splice(index, 1);
    setPreviewUrls(newPreviewUrls);
    
    console.log('useRequestForm - Files after removal:', newFiles);
    console.log('useRequestForm - Preview URLs after removal:', newPreviewUrls);
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
