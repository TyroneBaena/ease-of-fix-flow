import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { SubscriptionProvider, useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { isUserAdmin } from '@/utils/userRoles';
import Navbar from '@/components/Navbar';
import { Button } from "@/components/ui/button";
import { SubscriptionGuard } from '@/components/billing/SubscriptionGuard';

import { PropertyCreationWithBilling } from '@/components/property/PropertyCreationWithBilling';
import { PropertyAccessGuard } from '@/components/property/PropertyAccessGuard';
import { usePropertyBillingIntegration } from '@/hooks/usePropertyBillingIntegration';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Plus, MapPin, Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { toast } from '@/lib/toast';
import { EnhancedPropertyForm } from '@/components/property/EnhancedPropertyForm';

const PropertiesContent = () => {
  const { properties, loading } = usePropertyContext();
  const { currentUser } = useUserContext();
  const { refresh: refreshSubscription } = useSubscription();
  const isAdmin = isUserAdmin(currentUser);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Initialize billing integration
  usePropertyBillingIntegration();
  
  // REMOVED: Redundant refreshSubscription() call that causes race conditions
  // The SubscriptionProvider already handles data fetching on mount
  
  // Debug: Log properties to see current state
  console.log('Properties page - State:', { 
    propertiesCount: properties?.length || 0,
    loading,
    hasProperties: properties && properties.length > 0,
    properties: properties?.map(p => ({ id: p.id, name: p.name }))
  });

  const handleClose = () => {
    setDialogOpen(false);
  };

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <PropertyAccessGuard action="view">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600 mt-1">Manage all your properties in one place</p>
          </div>
          
          <PropertyAccessGuard action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="sm:max-w-[600px]"
                onInteractOutside={(e) => {
                  // Prevent dialog from closing when clicking on Google Maps autocomplete
                  const target = e.target as HTMLElement;
                  if (target.closest('.pac-container')) {
                    e.preventDefault();
                  }
                }}
              >
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new property. All fields are required.
                  </DialogDescription>
                </DialogHeader>
                <EnhancedPropertyForm onClose={handleClose} />
              </DialogContent>
            </Dialog>
          </PropertyAccessGuard>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <PropertyAccessGuard action="create">
            <PropertyCreationWithBilling 
              onCreateProperty={() => setDialogOpen(true)}
              className="max-w-md mx-auto"
            />
          </PropertyAccessGuard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...properties].sort((a, b) => a.name.localeCompare(b.name)).map((property) => (
              <Link to={`/properties/${property.id}`} key={property.id}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{property.name}</CardTitle>
                    <CardDescription className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{property.contactNumber}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{property.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Renewal: {new Date(property.renewalDate).toLocaleDateString()}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{property.rentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button variant="outline" className="w-full">View Details</Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
        </main>
      </PropertyAccessGuard>
      </div>
    </SubscriptionGuard>
  );
};

const Properties = () => {
  return <PropertiesContent />;
};

export default Properties;
