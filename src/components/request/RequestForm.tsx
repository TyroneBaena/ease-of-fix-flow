
import React from 'react';
import { Form } from "@/components/ui/form";
import { RequestFormTitle } from "./RequestFormTitle";
import { RequestFormDescription } from "./RequestFormDescription";
import { RequestFormCategoryLocation } from "./RequestFormCategoryLocation";
import { RequestFormPriority } from "./RequestFormPriority";
import { RequestFormAttachments } from "./RequestFormAttachments";
import { RequestFormActions } from "./RequestFormActions";
import { useRequestForm } from "@/hooks/useRequestForm";
import { toast } from "@/lib/toast";
import { useNavigate } from 'react-router-dom';

export const RequestForm = () => {
  const navigate = useNavigate();
  const { 
    formState, 
    updateFormState, 
    files, 
    previewUrls, 
    handleFileChange, 
    removeFile,
    isSubmitting,
    setIsSubmitting
  } = useRequestForm();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    const { title, description, category, location } = formState;
    
    if (!title || !description || !category || !location) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Your maintenance request has been submitted");
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RequestFormTitle 
        value={formState.title}
        onChange={(value) => updateFormState('title', value)}
      />
      
      <RequestFormDescription 
        value={formState.description}
        onChange={(value) => updateFormState('description', value)}
      />
      
      <RequestFormCategoryLocation 
        category={formState.category}
        location={formState.location}
        onCategoryChange={(value) => updateFormState('category', value)}
        onLocationChange={(value) => updateFormState('location', value)}
      />
      
      <RequestFormPriority 
        value={formState.priority}
        onChange={(value) => updateFormState('priority', value)}
      />
      
      <RequestFormAttachments
        files={files}
        previewUrls={previewUrls}
        onFileChange={handleFileChange}
        onRemoveFile={removeFile}
      />
      
      <RequestFormActions 
        isSubmitting={isSubmitting}
        onCancel={() => navigate('/dashboard')}
      />
    </form>
  );
};
