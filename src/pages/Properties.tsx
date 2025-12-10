import React, { useState, useEffect } from 'react';
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
import { PropertyListItem } from '@/components/property/PropertyListItem';
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Plus, MapPin, Phone, Mail, Calendar, DollarSign, LayoutGrid, List } from 'lucide-react';
import { toast } from '@/lib/toast';
import { formatFullDate } from '@/utils/dateFormatUtils';
import { EnhancedPropertyForm } from '@/components/property/EnhancedPropertyForm';

const PropertiesContent = () => {
  const { properties, loading } = usePropertyContext();
  const { currentUser } = useUserContext();
  const { refresh: refreshSubscription } = useSubscription();
  const isAdmin = isUserAdmin(currentUser);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('properties-view-mode');
    return (saved === 'list' || saved === 'grid') ? saved : 'grid';
  });
  
  // Initialize billing integration
  usePropertyBillingIntegration();
  
  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('properties-view-mode', viewMode);
  }, [viewMode]);
  
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
            <h1 className="text-3xl font-bold text-foreground">Properties</h1>
            <p className="text-muted-foreground mt-1">Manage all your properties in one place</p>
          </div>
          
          <div className="flex items-center gap-4">
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}
              className="border rounded-md"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view" className="px-3">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
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
        </div>
        
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-64 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          )
        ) : properties.length === 0 ? (
          <PropertyAccessGuard action="create">
            <PropertyCreationWithBilling 
              onCreateProperty={() => setDialogOpen(true)}
              className="max-w-md mx-auto"
            />
          </PropertyAccessGuard>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...properties].sort((a, b) => a.name.localeCompare(b.name)).map((property) => (
              <Link to={`/properties/${property.id}`} key={property.id}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{property.name}</CardTitle>
                    <CardDescription className="flex items-center text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{property.contactNumber}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{property.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Renewal: {formatFullDate(property.renewalDate)}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
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
        ) : (
          <div className="space-y-2">
            {[...properties].sort((a, b) => a.name.localeCompare(b.name)).map((property) => (
              <PropertyListItem 
                key={property.id} 
                property={property} 
                isAdmin={isAdmin} 
              />
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
