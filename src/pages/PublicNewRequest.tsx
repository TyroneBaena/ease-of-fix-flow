import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, ArrowLeft } from 'lucide-react';
import { Property } from '@/types/property';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { useRequestForm } from '@/hooks/useRequestForm';
import { useFileUpload } from '@/hooks/useFileUpload';
import { CategorySelectionField } from '@/components/request/CategorySelectionField';
import { ParticipantRelatedField } from '@/components/request/ParticipantRelatedField';
import { ParticipantNameField } from '@/components/request/ParticipantNameField';
import { AttemptedFixField } from '@/components/request/AttemptedFixField';
import { IssueNatureField } from '@/components/request/IssueNatureField';
import { ExplanationField } from '@/components/request/ExplanationField';
import { LocationField } from '@/components/request/LocationField';
import { ReportDateField } from '@/components/request/ReportDateField';
import { SubmittedByField } from '@/components/request/SubmittedByField';
import { RequestFormAttachments } from '@/components/request/RequestFormAttachments';

const PublicNewRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use the same form hooks as desktop version
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
  
  const { uploadFiles, isUploading } = useFileUpload();
  
  // Additional contact fields for public form
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (!propertyId) {
      toast.error('Property ID is required');
      navigate('/');
      return;
    }

    const fetchProperty = async () => {
      try {
        console.log('🔍 PublicNewRequest - Fetching property:', propertyId);
        
        const { data: propertyData, error: propertyError } = await supabase
          .rpc('get_public_property_info', { property_uuid: propertyId });

        if (propertyError || !propertyData || propertyData.length === 0) {
          console.error('Error fetching property:', propertyError);
          toast.error('Property not found');
          navigate('/');
          return;
        }

        const propertyRecord = propertyData[0];
        const mappedProperty: Property = {
          id: propertyRecord.id,
          name: propertyRecord.name,
          address: propertyRecord.address,
          contactNumber: propertyRecord.contact_number,
          email: propertyRecord.email,
          practiceLeader: propertyRecord.practice_leader,
          practiceLeaderEmail: propertyRecord.practice_leader_email,
          practiceLeaderPhone: propertyRecord.practice_leader_phone,
          renewalDate: null,
          rentAmount: propertyRecord.rent_amount,
          rentPeriod: propertyRecord.rent_period as 'week' | 'month',
          createdAt: propertyRecord.created_at,
          landlordId: null
        };

        setProperty(mappedProperty);
        // Set the property ID in form state
        updateFormState('propertyId', propertyId);
        // Set default report date to today
        updateFormState('reportDate', new Date().toISOString().split('T')[0]);
        
      } catch (error) {
        console.error('Error in fetchProperty:', error);
        toast.error('Error loading property data');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId, navigate]);

  // Removed handleInputChange as we now use updateFormState from the hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 PublicNewRequest - Form submission started');
    console.log('🔍 PublicNewRequest - Form data:', formState);
    console.log('🔍 PublicNewRequest - Property ID:', propertyId);
    console.log('🔍 PublicNewRequest - Contact info:', { contactEmail, contactPhone });
    
    // Enhanced validation
    if (!formState.issueNature?.trim()) {
      toast.error('Please describe the nature of the issue');
      return;
    }
    
    if (!formState.explanation?.trim()) {
      toast.error('Please provide an explanation of the issue');
      return;
    }
    
    if (!formState.submittedBy?.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!contactEmail?.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    
    if (!propertyId) {
      console.error('❌ PublicNewRequest - Property ID is missing');
      toast.error('Property ID is required to submit a request');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload files if any
      let attachmentUrls: string[] = [];
      if (files.length > 0) {
        console.log('🔍 PublicNewRequest - Uploading files:', files);
        try {
          const uploadedFiles = await uploadFiles(files);
          attachmentUrls = uploadedFiles.map(file => file.url);
          console.log('🔍 PublicNewRequest - Files uploaded successfully:', attachmentUrls);
        } catch (uploadError) {
          console.error('❌ PublicNewRequest - File upload error:', uploadError);
          toast.error('Failed to upload files. Please try again.');
          return;
        }
      }

      console.log('🔍 PublicNewRequest - Submitting request data:', {
        propertyId,
        issueNature: formState.issueNature,
        explanation: formState.explanation,
        submittedBy: formState.submittedBy,
        contactEmail: contactEmail,
        priority: formState.priority,
        attachments: attachmentUrls
      });

      // Use the secure database function to submit the public request
      const { data: requestId, error } = await supabase
        .rpc('submit_public_maintenance_request', {
          p_property_id: propertyId,
          p_title: formState.issueNature.trim(),
          p_description: formState.explanation.trim(),
          p_location: formState.location.trim() || property?.address || '',
          p_priority: formState.priority || 'medium',
          p_category: formState.budgetCategoryId || property?.name || 'General',
          p_submitted_by: formState.submittedBy.trim(),
          p_contact_email: contactEmail.trim(),
          p_contact_phone: contactPhone.trim() || null,
          p_issue_nature: formState.issueNature.trim(),
          p_explanation: formState.explanation.trim(),
          p_attempted_fix: formState.attemptedFix.trim() || null
        });

      console.log('🔍 PublicNewRequest - Database response:', { data: requestId, error });

      if (error) {
        console.error('❌ PublicNewRequest - Submission error:', error);
        toast.error(`Failed to submit request: ${error.message}`);
        return;
      }

      console.log('✅ PublicNewRequest - Request submitted successfully, ID:', requestId);
      toast.success('Request submitted successfully! You will receive an email confirmation shortly.');
      
      // Redirect back to the property view
      navigate(`/property-requests/${propertyId}`);
      
    } catch (error) {
      console.error('❌ PublicNewRequest - Unexpected error:', error);
      toast.error(`Failed to submit request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The property you're trying to submit a request for doesn't exist.
            </p>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground">Submit Maintenance Request</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/property-requests/${propertyId}`)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Property
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Building className="h-5 w-5 mr-2" />
              {property.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{property.address}</p>
          </CardHeader>
        </Card>

        {/* Request Form */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Request Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Please provide as much detail as possible about the maintenance issue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Email Address *</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Form Fields using the same components as desktop */}
              <CategorySelectionField
                category={formState.budgetCategoryId || ''}
                priority={formState.priority || ''}
                onCategoryChange={(value) => updateFormState('budgetCategoryId', value)}
                onPriorityChange={(value) => updateFormState('priority', value)}
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
                showError={false}
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

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/property-requests/${propertyId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {isSubmitting ? 'Submitting...' : isUploading ? 'Uploading...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PublicNewRequest;