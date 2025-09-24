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

      console.log('🔍 Fetching property data for ID:', id);

      // Use the edge function to safely fetch property data with property ID as URL parameter
      const response = await fetch(`https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-property-data?propertyId=${encodeURIComponent(id)}`);
      const result = await response.json();

      console.log('📦 Function response:', result);

      if (!response.ok || result.error) {
        console.error('❌ Error from function:', result.error);
        setError(result.error || 'Failed to load property information');
        return;
      }

      if (!result?.property) {
        console.log('❌ No property data received');
        setError('Property not found');
        return;
      }

      console.log('✅ Property loaded successfully:', result.property.name);
      console.log('📊 Budget categories available:', result.budgetCategories?.length || 0);
      setProperty(result.property);
      setRequests(result.requests || []);

    } catch (error) {
      console.error('Unexpected error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = () => {
    console.log('🚀 Navigating to new request for property:', id);
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
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center">
                <Building className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mr-2 sm:mr-3" />
                <span className="truncate">{property.name}</span>
              </h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 flex items-center text-sm sm:text-base">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                <span className="truncate">{property.address}</span>
              </p>
              <div className="mt-2 text-xs sm:text-sm text-muted-foreground space-y-1">
                <p>Practice Leader: {property.practiceLeader}</p>
                <p>Contact: {property.contactNumber}</p>
              </div>
            </div>
            <Button onClick={handleNewRequest} className="flex items-center text-sm sm:text-base w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Action Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Maintenance Request Portal</CardTitle>
              <p className="text-sm text-muted-foreground">Property ID: {id}</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Button onClick={handleNewRequest} className="h-16 flex flex-col items-center justify-center text-sm">
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <div className="text-center">
                    <div className="font-semibold text-xs sm:text-sm">Submit New Request</div>
                    <div className="text-xs opacity-80 hidden sm:block">Report a maintenance issue</div>
                  </div>
                </Button>
                <div className="h-16 flex flex-col items-center justify-center bg-muted rounded-md">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 text-muted-foreground" />
                  <div className="text-center">
                    <div className="font-semibold text-muted-foreground text-xs sm:text-sm">View Requests Below</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">See existing maintenance requests</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <span className="text-lg sm:text-xl">Maintenance Requests</span>
                <Badge variant="secondary" className="self-start sm:self-auto">{requests.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="text-muted-foreground">
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
                    <p className="text-sm sm:text-base">No maintenance requests yet</p>
                    <p className="text-xs sm:text-sm">Submit the first request for this property</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
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