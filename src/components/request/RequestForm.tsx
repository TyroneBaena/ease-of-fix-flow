
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form } from "@/components/ui/form";
import { RequestFormProperty } from "./RequestFormProperty";
import { RequestFormAttachments } from "./RequestFormAttachments";
import { RequestFormActions } from "./RequestFormActions";
import { useRequestForm } from "@/hooks/useRequestForm";
import { useFileUpload } from "@/hooks/useFileUpload";
import { usePropertyContext } from "@/contexts/property/PropertyContext";
import { useMaintenanceRequestContext } from "@/contexts/maintenance";
import { toast } from "@/lib/toast";
import { useNavigate } from 'react-router-dom';
import { ParticipantRelatedField } from './ParticipantRelatedField';
import { ParticipantNameField } from './ParticipantNameField';
import { AttemptedFixField } from './AttemptedFixField';
import { IssueNatureField } from './IssueNatureField';
import { ExplanationField } from './ExplanationField';
import { LocationField } from './LocationField';
import { ReportDateField } from './ReportDateField';
import { SubmittedByField } from './SubmittedByField';
import { useUserContext } from '@/contexts/UserContext';

export const RequestForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyIdParam = searchParams.get('propertyId');
  const { properties } = usePropertyContext();
  const { addRequestToProperty } = useMaintenanceRequestContext();
  const { currentUser } = useUserContext();
  const { uploadFiles, isUploading } = useFileUpload();
  
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
  
  useEffect(() => {
    // If propertyId is provided in URL, set it in the form
    if (propertyIdParam) {
      updateFormState('propertyId', propertyIdParam);
    }
  }, [propertyIdParam, updateFormState]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const {
      propertyId,
      isParticipantRelated,
      participantName,
      attemptedFix,
      issueNature,
      explanation,
      location,
      reportDate,
      submittedBy
    } = formState;
    
    // Get the selected property to use its name as the site
    const selectedProperty = properties.find(p => p.id === propertyId);
    const site = selectedProperty?.name || 'Unknown Property';
    
    if (!propertyId || !issueNature || !explanation || !location || !reportDate || !submittedBy || !attemptedFix) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (isParticipantRelated && (!participantName || participantName === 'N/A')) {
      toast.error("Please provide the participant's name");
      return;
    }
    
    if (!currentUser?.id) {
      toast.error("You must be logged in to submit a request");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Starting request submission with files:', files);
      
      // Upload files first if any exist
      let attachments = null;
      if (files.length > 0) {
        console.log('Uploading files...');
        const uploadedFiles = await uploadFiles(files);
        console.log('Files uploaded successfully:', uploadedFiles);
        
        if (uploadedFiles.length > 0) {
          attachments = uploadedFiles;
        }
      }

      console.log('Final attachments to save:', attachments);

      // Add the request to the selected property
      await addRequestToProperty({
        title: issueNature, // Use issueNature as title which is required
        isParticipantRelated: isParticipantRelated || false,
        participantName: isParticipantRelated ? participantName : 'N/A',
        attemptedFix,
        issueNature,
        explanation,
        location,
        reportDate,
        site, // Use the property name as the site
        submittedBy,
        propertyId,
        userId: currentUser.id, // Add the userId field
        user_id: currentUser.id, // For backward compatibility
        attachments: attachments
      });
      
      toast.success("Your maintenance request has been submitted");
      navigate('/dashboard');
    } catch (error) {
      toast.error("An error occurred while submitting the request");
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalLoading = isSubmitting || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RequestFormProperty 
        value={formState.propertyId}
        onChange={(value) => updateFormState('propertyId', value)}
        properties={properties}
      />
      
      <ParticipantRelatedField
        value={formState.isParticipantRelated || false}
        onChange={(value) => updateFormState('isParticipantRelated', value)}
      />
      
      <ParticipantNameField
        value={formState.participantName || ''}
        onChange={(value) => updateFormState('participantName', value)}
        isParticipantRelated={formState.isParticipantRelated || false}
      />
      
      <AttemptedFixField
        value={formState.attemptedFix || ''}
        onChange={(value) => updateFormState('attemptedFix', value)}
      />
      
      <RequestFormAttachments
        files={files}
        previewUrls={previewUrls}
        onFileChange={handleFileChange}
        onRemoveFile={removeFile}
        isUploading={isUploading}
      />
      
      <IssueNatureField
        value={formState.issueNature || ''}
        onChange={(value) => updateFormState('issueNature', value)}
      />
      
      <ExplanationField
        value={formState.explanation || ''}
        onChange={(value) => updateFormState('explanation', value)}
      />
      
      <LocationField
        value={formState.location || ''}
        onChange={(value) => updateFormState('location', value)}
      />
      
      <ReportDateField
        value={formState.reportDate || ''}
        onChange={(value) => updateFormState('reportDate', value)}
      />
      
      <SubmittedByField
        value={formState.submittedBy || ''}
        onChange={(value) => updateFormState('submittedBy', value)}
      />
      
      <RequestFormActions 
        isSubmitting={totalLoading}
        onCancel={() => navigate('/dashboard')}
      />
    </form>
  );
};
