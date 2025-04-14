
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
  site: string;
  submittedBy: string;
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
    site: '',
    submittedBy: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormState = (field: keyof FormState, value: any) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      
      // Limit to 10 files total
      if (files.length + selectedFiles.length > 10) {
        alert('You can upload a maximum of 10 files');
        return;
      }
      
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
