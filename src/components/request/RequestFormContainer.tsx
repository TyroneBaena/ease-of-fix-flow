
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRequestForm } from "@/hooks/useRequestForm";
import { useFileUpload } from "@/hooks/useFileUpload";
import { usePropertyContext } from "@/contexts/property/PropertyContext";
import { useMaintenanceRequestContext } from "@/contexts/maintenance";
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { toast } from "sonner";
import { RequestFormFields } from './RequestFormFields';
import { RequestFormActions } from './RequestFormActions';

export const RequestFormContainer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyIdParam = searchParams.get('propertyId');
  const isPublic = searchParams.get('public') === 'true';
  const { properties } = usePropertyContext();
  const { addRequestToProperty } = useMaintenanceRequestContext();
  const { currentUser } = useUserContext();
  const { uploadFiles, isUploading } = useFileUpload();
  const [showPhotoError, setShowPhotoError] = useState(false);
  
  const { 
    formState, 
    updateFormState, 
    files, 
    previewUrls, 
    handleFileChange, 
    removeFile,
    isSubmitting,
    setIsSubmitting,
    validatePhotos
  } = useRequestForm();
  
  useEffect(() => {
    // If propertyId is provided in URL, set it in the form
    if (propertyIdParam) {
      updateFormState('propertyId', propertyIdParam);
    }
  }, [propertyIdParam, updateFormState]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    console.log('🚀 RequestForm - handleSubmit called');
    console.log('📋 RequestForm - Form state:', formState);
    console.log('📁 RequestForm - Files to upload:', files);
    console.log('👤 RequestForm - Current user:', currentUser);
    console.log('🌐 RequestForm - Is public:', isPublic);
    console.log('🔗 RequestForm - Property ID param:', propertyIdParam);
    
    // Validate photos first
    if (!validatePhotos()) {
      console.log('RequestForm - Photo validation failed');
      setShowPhotoError(true);
      toast.error("Please upload at least one photo before submitting the request");
      return;
    }
    
    // Reset photo error if validation passes
    setShowPhotoError(false);
    
    const {
      propertyId,
      isParticipantRelated,
      participantName,
      attemptedFix,
      issueNature,
      explanation,
      location,
      reportDate,
      submittedBy,
      priority,
      budgetCategoryId
    } = formState;
    
    // Get the selected property to use its name as the site
    const selectedProperty = properties.find(p => p.id === propertyId);
    const site = selectedProperty?.name || 'Unknown Property';
    
    console.log('RequestForm - Selected property:', selectedProperty);
    console.log('RequestForm - Site name:', site);
    
    // More lenient validation for public users
    const requiredFields = isPublic 
      ? { propertyId, issueNature, explanation, location, reportDate, submittedBy, priority }
      : { propertyId, issueNature, explanation, location, reportDate, submittedBy, attemptedFix, priority, budgetCategoryId };
    
    const missingFields = Object.entries(requiredFields).filter(([key, value]) => !value);
    
    if (missingFields.length > 0) {
      console.log('❌ RequestForm - Validation failed - missing required fields:', missingFields.map(([key]) => key));
      toast.error(`Please fill in all required fields: ${missingFields.map(([key]) => key).join(', ')}`);
      return;
    }
    
    if (isParticipantRelated && (!participantName || participantName === 'N/A')) {
      console.log('❌ RequestForm - Validation failed - participant name required');
      toast.error("Please provide the participant's name");
      return;
    }
    
    // Skip user validation for public requests
    if (!isPublic && !currentUser?.id) {
      console.log('❌ RequestForm - Validation failed - no current user');
      toast.error("You must be logged in to submit a request");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('RequestForm - Starting request submission, isPublic:', isPublic);
      console.log('RequestForm - Files array:', files);
      console.log('RequestForm - Files array length:', files.length);
      
      // Upload files first if any exist
      let attachments = null;
      if (files.length > 0) {
        console.log('RequestForm - Files exist, starting upload process');
        console.log('RequestForm - Calling uploadFiles with:', files);
        
        const uploadedFiles = await uploadFiles(files);
        
        console.log('RequestForm - Upload completed');
        console.log('RequestForm - uploadFiles returned:', uploadedFiles);
        console.log('RequestForm - uploadedFiles length:', uploadedFiles.length);
        console.log('RequestForm - uploadedFiles content:', JSON.stringify(uploadedFiles, null, 2));
        
        if (uploadedFiles.length > 0) {
          attachments = uploadedFiles;
          console.log('RequestForm - Setting attachments to:', attachments);
        } else {
          console.log('RequestForm - No files were successfully uploaded');
        }
      } else {
        console.log('RequestForm - No files to upload');
      }

      console.log('RequestForm - Final attachments value before database save:', attachments);

      if (isPublic) {
        // Use edge function for public submission
        console.log('RequestForm - Using public edge function submission');
        
        try {
          const response = await fetch('https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/submit-public-maintenance-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              propertyId: propertyId,
              issueNature: issueNature,
              explanation: explanation,
              location: location,
              reportDate: reportDate,
              submittedBy: submittedBy,
              attemptedFix: attemptedFix,
              priority: priority,
              budgetCategoryId: budgetCategoryId
            })
          });

          const result = await response.json();
          console.log('RequestForm - Edge function response:', result);

          if (!response.ok || result.error) {
            console.error('RequestForm - Public submission error:', result.error);
            throw new Error(result.error || 'Failed to submit maintenance request');
          }

          console.log('✅ RequestForm - Public submission successful:', result);
          toast.success("Your maintenance request has been submitted successfully!");
          navigate(`/property-requests/${propertyId}`);
        } catch (error) {
          console.error('RequestForm - Public submission error:', error);
          throw error;
        }
      } else {
        // Use authenticated submission for logged-in users
        console.log('RequestForm - Using authenticated submission');
        
        const requestData = {
          title: issueNature,
          description: explanation,
          category: budgetCategoryId,
          priority: priority as 'low' | 'medium' | 'high' | 'critical', // Type assertion to fix the error
          budget_category_id: budgetCategoryId,
          isParticipantRelated: isParticipantRelated || false,
          participantName: isParticipantRelated ? participantName : 'N/A',
          attemptedFix,
          issueNature,
          explanation,
          location,
          reportDate,
          site,
          submittedBy,
          propertyId,
          userId: currentUser!.id.toString(),
          user_id: currentUser!.id.toString(),
          attachments: attachments
        };

        console.log('RequestForm - Request data being sent to addRequestToProperty:', requestData);

        // Add the request to the selected property
        const newRequest = await addRequestToProperty(requestData);
        
        console.log('RequestForm - addRequestToProperty returned:', newRequest);
        
        // Send email notifications
        try {
          const { data: session } = await supabase.auth.getSession();
          const accessToken = session.session?.access_token;
          
          if (accessToken && newRequest?.id) {
            console.log('Sending email notifications for request:', newRequest.id);
            await supabase.functions.invoke('send-maintenance-request-notification', {
              body: { request_id: newRequest.id },
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
          }
        } catch (emailError) {
          console.error('Failed to send email notifications:', emailError);
          // Don't block the success flow if email fails
        }
        
        toast.success("Your maintenance request has been submitted");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('RequestForm - Error during submission:', error);
      toast.error("An error occurred while submitting the request");
    } finally {
      console.log('RequestForm - Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const totalLoading = isSubmitting || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RequestFormFields
        formState={formState}
        updateFormState={updateFormState}
        properties={properties}
        files={files}
        previewUrls={previewUrls}
        handleFileChange={handleFileChange}
        removeFile={removeFile}
        isUploading={isUploading}
        showPhotoError={showPhotoError}
      />
      
      <RequestFormActions 
        isSubmitting={totalLoading}
        onCancel={() => navigate(isPublic ? `/property-requests/${propertyIdParam}` : '/dashboard')}
      />
    </form>
  );
};
