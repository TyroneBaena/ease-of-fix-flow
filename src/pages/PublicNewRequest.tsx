import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, ArrowLeft } from 'lucide-react';
import { Property } from '@/types/property';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

const PublicNewRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    category: '',
    submittedBy: '',
    contactEmail: '',
    contactPhone: '',
    issueNature: '',
    explanation: '',
    attemptedFix: ''
  });

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
        setFormData(prev => ({
          ...prev,
          category: mappedProperty.name // Set property name as default category
        }));
        
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 PublicNewRequest - Form submission started');
    console.log('🔍 PublicNewRequest - Form data:', formData);
    console.log('🔍 PublicNewRequest - Property ID:', propertyId);
    
    // Enhanced validation with detailed logging
    const requiredFields = ['title', 'description', 'submittedBy', 'contactEmail'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]?.trim());
    
    if (missingFields.length > 0) {
      console.error('❌ PublicNewRequest - Missing required fields:', missingFields);
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    if (!propertyId) {
      console.error('❌ PublicNewRequest - Property ID is missing');
      toast.error('Property ID is required to submit a request');
      return;
    }

    setSubmitting(true);
    
    try {
      console.log('🔍 PublicNewRequest - Submitting request data:', {
        propertyId,
        title: formData.title,
        description: formData.description,
        submittedBy: formData.submittedBy,
        contactEmail: formData.contactEmail,
        priority: formData.priority
      });

      // Use the secure database function to submit the public request
      const { data: requestId, error } = await supabase
        .rpc('submit_public_maintenance_request', {
          p_property_id: propertyId,
          p_title: formData.title.trim(),
          p_description: formData.description.trim(),
          p_location: formData.location.trim() || null,
          p_priority: formData.priority,
          p_category: formData.category.trim() || property?.name || 'General',
          p_submitted_by: formData.submittedBy.trim(),
          p_contact_email: formData.contactEmail.trim(),
          p_contact_phone: formData.contactPhone.trim() || null,
          p_issue_nature: formData.issueNature.trim() || formData.title.trim(),
          p_explanation: formData.explanation.trim() || formData.description.trim(),
          p_attempted_fix: formData.attemptedFix.trim() || null
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
      setSubmitting(false);
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
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Your Name *</label>
                  <Input
                    value={formData.submittedBy}
                    onChange={(e) => handleInputChange('submittedBy', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email Address *</label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Issue Details */}
              <div>
                <label className="text-sm font-medium text-foreground">Issue Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Brief summary of the issue"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Issue Description *</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Provide a detailed description of the maintenance issue"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Location</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Specific location within the property"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Have you attempted to fix this yourself?</label>
                <Textarea
                  value={formData.attemptedFix}
                  onChange={(e) => handleInputChange('attemptedFix', e.target.value)}
                  placeholder="Describe any attempts you've made to resolve the issue"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/property-requests/${propertyId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
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