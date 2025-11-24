
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRequestForm } from "@/hooks/useRequestForm";
import { useFileUpload } from "@/hooks/useFileUpload";
import { usePropertyContext } from "@/contexts/property/PropertyContext";
import { usePublicPropertyContext } from "@/contexts/property/PublicPropertyProvider";
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
  
  // Use appropriate context based on public/private access
  let properties: any[] = [];
  try {
    if (isPublic) {
      const { properties: publicProperties } = usePublicPropertyContext();
      properties = publicProperties;
      console.log('🔍 [DEBUG] RequestFormContainer - Using public properties:', properties.length);
    } else {
      const { properties: privateProperties } = usePropertyContext();
      properties = privateProperties;
      console.log('🔍 [DEBUG] RequestFormContainer - Using private properties:', properties.length);
    }
  } catch (error) {
    console.log('⚠️ [DEBUG] RequestFormContainer - Context not available:', error);
    properties = [];
  }
  
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
    
    console.log('🔍 [DEBUG] RequestForm - Form submission started');
    console.log('🔍 [DEBUG] RequestForm - Current form values:', {
      propertyId, issueNature, explanation, location, reportDate, submittedBy, 
      priority, budgetCategoryId, attemptedFix, isParticipantRelated, participantName
    });
    console.log('🔍 [DEBUG] RequestForm - isPublic:', isPublic);
    console.log('🔍 [DEBUG] RequestForm - Selected property:', selectedProperty);
    console.log('🔍 [DEBUG] RequestForm - Site name:', site);
    
    // More lenient validation - priority and budgetCategory are now optional (hidden fields with defaults)
    const requiredFieldsCheck = isPublic 
      ? !propertyId || !issueNature || !explanation || !location || !reportDate || !submittedBy
      : !propertyId || !issueNature || !explanation || !location || !reportDate || !submittedBy || !attemptedFix;
    
      console.log('🔍 [DEBUG] RequestForm - Validation check result:', requiredFieldsCheck);
    
    if (requiredFieldsCheck) {
      console.log('❌ [DEBUG] RequestForm - Validation failed');
      console.log('❌ [DEBUG] Missing fields check:', { propertyId, issueNature, explanation, location, reportDate, submittedBy, priority, budgetCategoryId, attemptedFix });
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (isParticipantRelated && (!participantName || participantName === 'N/A')) {
      console.log('❌ [DEBUG] RequestForm - Validation failed - participant name required');
      toast.error("Please provide the participant's name");
      return;
    }
    
    // Skip user validation for public requests
    if (!isPublic && !currentUser?.id) {
      console.log('❌ [DEBUG] RequestForm - Validation failed - no current user');
      toast.error("You must be logged in to submit a request");
      return;
    }
    
    console.log('✅ [DEBUG] RequestForm - All validations passed, starting submission');
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
          console.log('🚀 [DEBUG] RequestForm - Using public edge function submission');
          console.log('📦 [DEBUG] RequestForm - Sending data:', {
            propertyId: propertyId,
            issueNature: issueNature,
            explanation: explanation,
            location: location,
              reportDate: reportDate,
              submittedBy: submittedBy,
              attemptedFix: attemptedFix || 'None attempted',
              priority: priority || 'medium', // Use default if empty
              budgetCategoryId: budgetCategoryId || null
          });
          
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
              attemptedFix: attemptedFix || 'None attempted',
              priority: priority || 'medium', // Use default if empty
              budgetCategoryId: budgetCategoryId || null
            })
          });

          console.log('📡 [DEBUG] RequestForm - Response status:', response.status);
          const result = await response.json();
          console.log('📦 [DEBUG] RequestForm - Edge function response:', JSON.stringify(result, null, 2));

          if (!response.ok || result.error) {
            console.error('❌ [DEBUG] RequestForm - Public submission error:', result.error);
            throw new Error(result.error || 'Failed to submit maintenance request');
          }

          console.log('✅ [DEBUG] RequestForm - Public submission successful:', result);
          toast.success("Your maintenance request has been submitted successfully!");
          
          // Redirect to public property page so users can see their submitted request
          console.log('🔄 [DEBUG] RequestForm - Redirecting to public property page:', `/property-requests/${propertyId}`);
          navigate(`/property-requests/${propertyId}`);
        } catch (error) {
          console.error('❌ [DEBUG] RequestForm - Public submission error:', error);
          console.error('❌ [DEBUG] RequestForm - Error details:', error instanceof Error ? error.message : 'Unknown error');
          console.error('❌ [DEBUG] RequestForm - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          toast.error("Something went wrong. Please try again.");
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
        
        if (!newRequest) {
          throw new Error('Failed to create maintenance request');
        }
        
        // Send email notifications (non-blocking - happens in background during redirect)
        try {
          const { data: session } = await supabase.auth.getSession();
          const accessToken = session.session?.access_token;
          
          if (accessToken && newRequest?.id) {
            console.log('Sending email notifications for request:', newRequest.id);
            // Fire and forget - don't await, let it happen during redirect
            supabase.functions.invoke('send-maintenance-request-notification', {
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
        
        // Redirect to dashboard after successful submission
        toast.success("Maintenance request added successfully!");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('❌ [DEBUG] RequestForm - Overall submission error:', error);
      console.error('❌ [DEBUG] RequestForm - Error type:', typeof error);
      console.error('❌ [DEBUG] RequestForm - Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [DEBUG] RequestForm - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          toast.error("Please check all required fields are filled correctly.");
        } else {
          toast.error(`Submission failed: ${error.message}`);
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      console.log('🔍 [DEBUG] RequestForm - Setting isSubmitting to false');
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
        onCancel={() => navigate('/dashboard')}
      />
    </form>
  );
};
