import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Plus, Eye, Edit, Clock } from 'lucide-react';
import { Property } from '@/types/property';
import { MaintenanceRequest } from '@/types/maintenance';

/**
 * Public maintenance requests page for QR code access
 * Allows users to view and submit maintenance requests without authentication
 */
const PublicPropertyRequests = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchPropertyAndRequests();
    }
  }, [id]);

  const fetchPropertyAndRequests = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch property data (publicly accessible)
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (propertyError) {
        console.error('Error fetching property:', propertyError);
        setError('Failed to load property information');
        return;
      }

      if (!propertyData) {
        setError('Property not found');
        return;
      }

      // Transform property data
      const transformedProperty: Property = {
        id: propertyData.id,
        name: propertyData.name,
        address: propertyData.address,
        contactNumber: propertyData.contact_number,
        email: propertyData.email,
        practiceLeader: propertyData.practice_leader,
        practiceLeaderEmail: propertyData.practice_leader_email || '',
        practiceLeaderPhone: propertyData.practice_leader_phone || '',
        renewalDate: propertyData.renewal_date || '',
        rentAmount: propertyData.rent_amount || 0,
        rentPeriod: (propertyData.rent_period as 'week' | 'month') || 'month',
        createdAt: propertyData.created_at,
        landlordId: propertyData.landlord_id
      };

      setProperty(transformedProperty);

      // Fetch maintenance requests for this property (publicly viewable)
      const { data: requestsData, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('property_id', id)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        // Don't show error for requests, just log it
      } else {
        // Transform requests data
        const transformedRequests: MaintenanceRequest[] = (requestsData || []).map((req: any) => ({
          id: req.id,
          isParticipantRelated: req.is_participant_related || false,
          participantName: req.participant_name || '',
          attemptedFix: req.attempted_fix || '',
          issueNature: req.issue_nature || '',
          explanation: req.explanation || '',
          location: req.location || '',
          reportDate: req.report_date || '',
          site: req.site || '',
          submittedBy: req.submitted_by || '',
          status: req.status || 'pending',
          title: req.title || '',
          description: req.description || '',
          category: req.category || '',
          priority: req.priority || 'medium',
          propertyId: req.property_id,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
          assignedTo: req.assigned_to,
          dueDate: req.due_date,
          attachments: req.attachments,
          history: req.history,
          userId: req.user_id || '', // Add the required userId field
        }));

        setRequests(transformedRequests);
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = () => {
    navigate(`/new-request?propertyId=${id}&public=true`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h1>
          <p className="text-muted-foreground">The requested property could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center">
                <Building className="h-8 w-8 mr-3" />
                {property.name}
              </h1>
              <p className="text-muted-foreground mt-2 flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {property.address}
              </p>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Practice Leader: {property.practiceLeader}</p>
                <p>Contact: {property.contactNumber}</p>
              </div>
            </div>
            <Button onClick={handleNewRequest} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Quick Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Request Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={handleNewRequest} className="h-16 flex flex-col items-center justify-center">
                  <Plus className="h-6 w-6 mb-2" />
                  <div className="text-center">
                    <div className="font-semibold">Submit New Request</div>
                    <div className="text-sm opacity-80">Report a maintenance issue</div>
                  </div>
                </Button>
                <div className="h-16 flex flex-col items-center justify-center bg-muted rounded-md">
                  <Eye className="h-6 w-6 mb-2 text-muted-foreground" />
                  <div className="text-center">
                    <div className="font-semibold text-muted-foreground">View Requests Below</div>
                    <div className="text-sm text-muted-foreground">See existing maintenance requests</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Maintenance Requests
                <Badge variant="secondary">{requests.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>No maintenance requests yet</p>
                    <p className="text-sm">Submit the first request for this property</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">
                          {request.issueNature || request.title || 'Maintenance Request'}
                        </h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {request.explanation || request.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Location: {request.location || request.site}</span>
                        <span>Submitted: {new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>
                      {request.submittedBy && (
                        <div className="text-xs text-muted-foreground mt-1">
                          By: {request.submittedBy}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicPropertyRequests;