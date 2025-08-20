import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import Navbar from '@/components/Navbar';
import { PropertyRequests } from '@/components/property/PropertyRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, MapPin, Phone, Mail } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { Property } from '@/types/property';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';

const PropertyRequestsView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProperty, properties, loading: propertiesLoading } = usePropertyContext();
  const { getRequestsForProperty, refreshRequests, requests: allRequests } = useMaintenanceRequestContext();
  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  // Get requests for this property directly from context (reactive to changes)
  const requests = property ? getRequestsForProperty(property.id) : [];

  useEffect(() => {
    console.log('=== PropertyRequestsView Debug ===');
    console.log('URL ID parameter:', id);
    console.log('Properties loading:', propertiesLoading);
    console.log('Properties array:', properties);
    console.log('Properties count:', properties.length);
    
    // Don't proceed if properties are still loading
    if (propertiesLoading) {
      console.log('Properties still loading, waiting...');
      return;
    }
    
    if (id) {
      console.log('Looking for property with ID:', id);
      console.log('Available property IDs:', properties.map(p => ({ id: p.id, name: p.name })));
      
      const propertyData = getProperty(id);
      console.log('getProperty result:', propertyData);
      
      if (propertyData) {
        console.log('Property found:', propertyData);
        setProperty(propertyData);
        
        // Set up direct real-time subscription for immediate UI updates
        const channel = supabase
          .channel(`property-${id}-requests-direct`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'maintenance_requests',
              filter: `property_id=eq.${id}`
            },
            async (payload) => {
              console.log('🔄 REAL-TIME: Property request change detected:', payload.eventType, payload);
              
              // Force immediate refresh of maintenance context
              try {
                await refreshRequests();
                console.log('✅ REAL-TIME: Context refreshed successfully');
              } catch (error) {
                console.error('❌ REAL-TIME: Error refreshing context:', error);
              }
            }
          )
          .subscribe((status) => {
            console.log('🔌 REAL-TIME: Subscription status:', status);
          });

        // Cleanup subscription
        return () => {
          console.log('🔌 REAL-TIME: Unsubscribing from property-specific requests channel');
          supabase.removeChannel(channel);
        };
      } else {
        console.log('Property NOT found - showing error');
        console.log('Search failed for ID:', id);
        console.log('In properties:', properties.map(p => p.id));
        
        // Only show error if properties have finished loading and we still can't find it
        if (!propertiesLoading && properties.length > 0) {
          toast.error('Property not found');
          navigate('/dashboard');
          return;
        }
      }
    } else {
      console.log('No ID parameter in URL');
    }
    setLoading(false);
  }, [id, getProperty, navigate, properties, propertiesLoading]);

  // Add debug logging for requests changes
  useEffect(() => {
    console.log('🔄 PropertyRequestsView: Requests updated, count:', requests.length);
    console.log('🔄 PropertyRequestsView: Current requests:', requests.map(r => ({ id: r.id, issueNature: r.issueNature })));
  }, [requests, allRequests]); // React to both local requests and context changes

  if (loading || propertiesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
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
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h1>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Simple header for maintenance requests focus */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <Button
              onClick={() => navigate(`/new-request?propertyId=${id}`)}
              className="flex items-center"
            >
              Create New Request
            </Button>
          </div>
          
          {/* Minimal property header focused on maintenance requests */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center">
                  <Building className="h-6 w-6 mr-2" />
                  {property.name} - Maintenance Requests
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Practice Leader: {property.practiceLeader}</p>
                <p>{property.contactNumber}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Maintenance Requests Section */}
        <PropertyRequests 
          requests={requests as any} 
          propertyId={id!} 
          onRequestUpdated={() => {
            // Real-time subscription will handle the refresh automatically
            console.log('Request updated - real-time will handle refresh');
          }} 
        />
      </main>
    </div>
  );
};

export default PropertyRequestsView;