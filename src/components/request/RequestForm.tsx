
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form } from "@/components/ui/form";
import { RequestFormTitle } from "./RequestFormTitle";
import { RequestFormDescription } from "./RequestFormDescription";
import { RequestFormCategoryLocation } from "./RequestFormCategoryLocation";
import { RequestFormPriority } from "./RequestFormPriority";
import { RequestFormAttachments } from "./RequestFormAttachments";
import { RequestFormActions } from "./RequestFormActions";
import { RequestFormProperty } from "./RequestFormProperty";
import { useRequestForm } from "@/hooks/useRequestForm";
import { usePropertyContext } from "@/contexts/PropertyContext";
import { toast } from "@/lib/toast";
import { useNavigate } from 'react-router-dom';

export const RequestForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyIdParam = searchParams.get('propertyId');
  const { properties } = usePropertyContext();
  
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
  
  const { addRequestToProperty } = usePropertyContext();

  useEffect(() => {
    // If propertyId is provided in URL, set it in the form
    if (propertyIdParam) {
      updateFormState('propertyId', propertyIdParam);
    }
  }, [propertyIdParam, updateFormState]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    const { title, description, category, location, propertyId } = formState;
    
    if (!title || !description || !category || !location || !propertyId) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    // Add the request to the selected property
    try {
      addRequestToProperty({
        title,
        description,
        category,
        location,
        priority: formState.priority,
        propertyId
      });
      
      // Simulate API call
      setTimeout(() => {
        setIsSubmitting(false);
        toast.success("Your maintenance request has been submitted");
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      setIsSubmitting(false);
      toast.error("An error occurred while submitting the request");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RequestFormProperty 
        value={formState.propertyId}
        onChange={(value) => updateFormState('propertyId', value)}
        properties={properties}
      />
      
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
