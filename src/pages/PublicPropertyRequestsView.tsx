import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, MapPin, Phone, Mail, Plus, ExternalLink } from 'lucide-react';
import { Property } from '@/types/property';
import { MaintenanceRequest } from '@/types/maintenance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

const PublicPropertyRequestsView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchPropertyAndRequests = async () => {
      try {
        // Fetch property details
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propertyError) {
          console.error('Error fetching property:', propertyError);
          toast.error('Property not found');
          setLoading(false);
          return;
        }

        // Map database fields to Property type
        const mappedProperty: Property = {
          id: propertyData.id,
          name: propertyData.name,
          address: propertyData.address,
          contactNumber: propertyData.contact_number,
          email: propertyData.email,
          practiceLeader: propertyData.practice_leader,
          practiceLeaderEmail: propertyData.practice_leader_email,
          practiceLeaderPhone: propertyData.practice_leader_phone,
          renewalDate: propertyData.renewal_date,
          rentAmount: propertyData.rent_amount,
          rentPeriod: propertyData.rent_period as 'week' | 'month',
          createdAt: propertyData.created_at,
          landlordId: propertyData.landlord_id
        };

        setProperty(mappedProperty);

        // Fetch maintenance requests for this property
        const { data: requestsData, error: requestsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('property_id', id)
          .order('created_at', { ascending: false });

        if (requestsError) {
          console.error('Error fetching requests:', requestsError);
        } else {
          // Map database fields to MaintenanceRequest type
          const mappedRequests: MaintenanceRequest[] = (requestsData || []).map(request => ({
            id: request.id,
            title: request.title || request.issue_nature || 'Maintenance Request',
            description: request.description,
            status: request.status as 'pending' | 'in-progress' | 'completed' | 'open',
            location: request.location,
            priority: request.priority as 'low' | 'medium' | 'high' | 'critical',
            site: request.site,
            submittedBy: request.submitted_by,
            createdAt: request.created_at,
            updatedAt: request.updated_at,
            propertyId: request.property_id,
            assignedTo: request.assigned_to,
            dueDate: request.due_date,
            attachments: Array.isArray(request.attachments) ? 
              request.attachments.map((att: any) => ({
                url: att.url || att,
                name: att.name,
                type: att.type
              })) : null,
            category: request.category,
            history: Array.isArray(request.history) ? 
              request.history.map((hist: any) => ({
                action: hist.action || '',
                timestamp: hist.timestamp || ''
              })) : null,
            isParticipantRelated: request.is_participant_related || false,
            participantName: request.participant_name || '',
            attemptedFix: request.attempted_fix || '',
            issueNature: request.issue_nature || '',
            explanation: request.explanation || '',
            reportDate: request.report_date || request.created_at,
            userId: request.user_id
          }));
          setRequests(mappedRequests);
        }

      } catch (error) {
        console.error('Error in fetchPropertyAndRequests:', error);
        toast.error('Error loading property data');
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyAndRequests();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The property you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => navigate('/login')}>
              Sign In to Access Full Features
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
            <h1 className="text-lg font-semibold text-foreground">Property Maintenance</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/login')}
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  {property.name}
                </CardTitle>
                <p className="text-muted-foreground mt-1 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </p>
              </div>
              <Button
                onClick={() => navigate(`/new-request?propertyId=${id}`)}
                className="flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="font-medium">Practice Leader:</span> {property.practiceLeader}</p>
                <p><span className="font-medium">Contact:</span> {property.contactNumber}</p>
              </div>
              <div>
                <p><span className="font-medium">Rent:</span> ${property.rentAmount}/{property.rentPeriod}</p>
                <p><span className="font-medium">Status:</span> Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Maintenance Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Maintenance Requests</CardTitle>
            <p className="text-sm text-muted-foreground">
              Recent maintenance activity for this property
            </p>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <div className="space-y-4">
                {requests.slice(0, 5).map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">
                          {request.issueNature || 'Maintenance Request'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {request.explanation || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Status: {request.status}</span>
                          <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'completed' ? 'bg-green-100 text-green-800' :
                          request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {requests.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    And {requests.length - 5} more requests...
                    <Button variant="link" size="sm" onClick={() => navigate('/login')}>
                      Sign in to view all
                    </Button>
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No maintenance requests found for this property.</p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate(`/new-request?propertyId=${id}`)}
                >
                  Create First Request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call to action */}
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Need to submit a maintenance request?
              </h3>
              <p className="text-muted-foreground mb-4">
                Sign in or create an account to submit and track maintenance requests for this property.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate('/signup')}>
                  Create Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PublicPropertyRequestsView;