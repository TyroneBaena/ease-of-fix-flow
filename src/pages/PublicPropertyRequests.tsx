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
import RequestCard from '@/components/RequestCard';

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

      console.log('🔍 [DEBUG] Fetching property data for ID:', id);
      console.log('🔍 [DEBUG] Current URL:', window.location.href);

      // Use the edge function to safely fetch property data with property ID as URL parameter
      const url = `https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-property-data?propertyId=${encodeURIComponent(id!)}`;
      console.log('🌐 [DEBUG] Calling edge function URL:', url);
      
      const response = await fetch(url);
      console.log('📡 [DEBUG] Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('📦 [DEBUG] Full function response:', JSON.stringify(result, null, 2));

      if (!response.ok || result.error) {
        console.error('❌ [DEBUG] Error from function:', result.error);
        setError(result.error || 'Failed to load property information');
        return;
      }

      if (!result?.property) {
        console.log('❌ [DEBUG] No property data received');
        console.log('❌ [DEBUG] Result structure:', Object.keys(result || {}));
        setError('Property not found');
        return;
      }

      console.log('✅ [DEBUG] Property loaded successfully:', result.property.name);
      console.log('📊 [DEBUG] Budget categories available:', result.budgetCategories?.length || 0);
      console.log('📊 [DEBUG] Budget categories data:', result.budgetCategories);
      console.log('📋 [DEBUG] Requests available:', result.requests?.length || 0);
      
      setProperty(result.property);
      setRequests(result.requests || []);

    } catch (error) {
      console.error('💥 [DEBUG] Unexpected error:', error);
      console.error('💥 [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center">
                <Building className="h-7 w-7 lg:h-8 lg:w-8 mr-3" />
                <span className="truncate">{property.name}</span>
              </h1>
              <p className="text-muted-foreground mt-2 flex items-center text-base">
                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate">{property.address}</span>
              </p>
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                <p>Practice Leader: {property.practiceLeader}</p>
                <p>Contact: {property.contactNumber}</p>
              </div>
            </div>
            <Button onClick={handleNewRequest} className="flex items-center text-base w-full lg:w-auto">
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
                <CardTitle className="text-xl">Maintenance Request Portal</CardTitle>
                <p className="text-sm text-muted-foreground">Property ID: {id}</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Button onClick={handleNewRequest} className="h-16 flex flex-col items-center justify-center text-sm">
                    <Plus className="h-6 w-6 mb-2" />
                    <div className="text-center">
                      <div className="font-semibold text-sm">Submit New Request</div>
                      <div className="text-xs opacity-80">Report a maintenance issue</div>
                    </div>
                  </Button>
                  <div className="h-16 flex flex-col items-center justify-center bg-muted rounded-md">
                    <Eye className="h-6 w-6 mb-2 text-muted-foreground" />
                    <div className="text-center">
                      <div className="font-semibold text-muted-foreground text-sm">View Requests Below</div>
                      <div className="text-xs text-muted-foreground">See existing maintenance requests</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-2 lg:space-y-0">
                  <span className="text-xl">Maintenance Requests</span>
                  <Badge variant="secondary" className="self-start lg:self-auto">{requests.length} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-base">No maintenance requests yet</p>
                      <p className="text-sm">Submit the first request for this property</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onClick={() => {
                          console.log('🔍 [DEBUG] Navigating to public request details for:', request.id);
                          navigate(`/public-request/${request.id}`);
                        }}
                      />
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