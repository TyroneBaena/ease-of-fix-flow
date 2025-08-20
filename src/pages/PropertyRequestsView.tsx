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

const PropertyRequestsView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProperty, properties, loading: propertiesLoading } = usePropertyContext();
  const { getRequestsForProperty } = useMaintenanceRequestContext();
  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('=== PropertyRequestsView Debug ===');
    console.log('URL ID parameter:', id);
    console.log('Properties loading:', propertiesLoading);
    console.log('Properties array:', properties);
    console.log('Properties count:', properties.length);
    
    if (id) {
      console.log('Looking for property with ID:', id);
      console.log('Available property IDs:', properties.map(p => ({ id: p.id, name: p.name })));
      
      const propertyData = getProperty(id);
      console.log('getProperty result:', propertyData);
      
      if (propertyData) {
        console.log('Property found:', propertyData);
        setProperty(propertyData);
        const propertyRequests = getRequestsForProperty(id);
        console.log('Requests for property:', propertyRequests);
        setRequests(propertyRequests);
      } else {
        console.log('Property NOT found - showing error');
        console.log('Search failed for ID:', id);
        console.log('In properties:', properties.map(p => p.id));
        toast.error('Property not found');
        navigate('/dashboard');
        return;
      }
    } else {
      console.log('No ID parameter in URL');
    }
    setLoading(false);
  }, [id, getProperty, getRequestsForProperty, navigate, properties, propertiesLoading]);

  if (loading) {
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
        {/* Header with property info */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-bold">
                <Building className="h-5 w-5 mr-2" />
                {property.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{property.address}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{property.contactNumber}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{property.email}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Building className="h-4 w-4 mr-2" />
                  <span>Practice Leader: {property.practiceLeader}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance Requests */}
        <PropertyRequests requests={requests as any} propertyId={id!} />
        
        {/* Quick Action Button */}
        <div className="mt-6 text-center">
          <Button
            size="lg"
            onClick={() => navigate(`/new-request?propertyId=${id}`)}
          >
            Create New Maintenance Request
          </Button>
        </div>
      </main>
    </div>
  );
};

export default PropertyRequestsView;