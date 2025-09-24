
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import Navbar from '@/components/Navbar';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { PropertyForm } from '@/components/property/PropertyForm';
import { PropertyHeader } from '@/components/property/PropertyHeader';
import { PropertyInfo } from '@/components/property/PropertyInfo';
import { PropertyRequests } from '@/components/property/PropertyRequests';
import { PropertyQuickActions } from '@/components/property/PropertyQuickActions';
import { MaintenanceSpendCard } from '@/components/property/MaintenanceSpendCard';
import { BudgetManagement } from '@/components/property/BudgetManagement';
import { useBudgetData } from '@/hooks/useBudgetData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { MaintenanceRequest } from '@/types/maintenance';
import { Property } from '@/types/property';

interface TemporarySession {
  sessionToken: string;
  propertyId: string;
  propertyName: string;
  organizationId: string;
  expiresAt: string;
}

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProperty, deleteProperty, properties, loading } = usePropertyContext();
  const { getRequestsForProperty } = useMaintenanceRequestContext();
  
  // Check for temporary session
  const [temporarySession, setTemporarySession] = useState<TemporarySession | null>(null);
  const [temporaryProperty, setTemporaryProperty] = useState<Property | null>(null);
  const [isTemporaryAccess, setIsTemporaryAccess] = useState(false);
  
  // Use context data for authenticated users, temporary data for QR access
  const property = isTemporaryAccess ? temporaryProperty : (id ? getProperty(id) : undefined);
  const [requests, setRequests] = useState<MaintenanceRequest[]>(id ? getRequestsForProperty(id) : []);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Check for temporary session on mount
  useEffect(() => {
    const checkTemporarySession = async () => {
      const storedSession = localStorage.getItem('temporarySession');
      
      if (storedSession && id) {
        try {
          const sessionData: TemporarySession = JSON.parse(storedSession);
          
          // Check if session matches property ID and is not expired
          if (sessionData.propertyId === id && new Date(sessionData.expiresAt) > new Date()) {
            setTemporarySession(sessionData);
            setIsTemporaryAccess(true);
            
            // Fetch property data using the session token
            const { data: propertyData, error } = await supabase
              .from('properties')
              .select('*')
              .eq('id', id)
              .maybeSingle();
            
            if (propertyData && !error) {
              // Transform database data to Property type
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
              setTemporaryProperty(transformedProperty);
            }
          }
        } catch (error) {
          console.error('Invalid temporary session data:', error);
          localStorage.removeItem('temporarySession');
        }
      }
    };

    checkTemporarySession();
  }, [id]);

  // Re-fetch requests when property changes (in case property ID dependencies change)
  useEffect(() => {
    if (id && !isTemporaryAccess) {
      const updatedRequests = getRequestsForProperty(id);
      setRequests(updatedRequests);
    }
  }, [id, getRequestsForProperty, properties, isTemporaryAccess]); // Re-run when properties context changes
  
  // Only load budget data if we have a valid property ID
  const { maintenanceSpend, currentFinancialYear, loading: budgetLoading, getBudgetAnalysis } = useBudgetData(id || '');

  useEffect(() => {
    console.log('PropertyDetail: Effect triggered', { 
      id, 
      isTemporaryAccess, 
      propertiesCount: properties.length, 
      loading,
      property: property ? `Found: ${property.name}` : 'Not found'
    });
    
    if (id && !isTemporaryAccess) {
      const propertyData = getProperty(id);
      console.log('PropertyDetail: Looking for property with ID:', id);
      console.log('PropertyDetail: Available properties:', properties.length);
      console.log('PropertyDetail: Available property IDs:', properties.map(p => p.id));
      console.log('PropertyDetail: Found property:', propertyData);
      console.log('PropertyDetail: Loading state:', loading);
      
      if (!propertyData && !loading && properties.length > 0) {
        console.log('PropertyDetail: Property not found, redirecting to properties page');
        toast.error('Property not found');
        navigate('/properties');
      }
    }
  }, [id, getProperty, navigate, isTemporaryAccess, properties, loading, property]);

  const handleDeleteProperty = () => {
    if (id) {
      deleteProperty(id);
      toast.success('Property deleted successfully');
      navigate('/properties');
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    // Property data will automatically update via context
  };

  // Show unified loading state until both property and budget data are ready
  if ((!property && !isTemporaryAccess) || (id && budgetLoading) || (loading && !isTemporaryAccess)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show Navbar for authenticated users */}
      {!isTemporaryAccess && <Navbar />}
      
      {/* Temporary session header */}
      {isTemporaryAccess && temporarySession && (
        <div className="bg-blue-50 border-b border-blue-200 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-blue-800">
              Temporary access to {temporarySession.propertyName} • 
              Expires: {new Date(temporarySession.expiresAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Only show PropertyHeader with actions for authenticated users */}
        {!isTemporaryAccess && (
          <PropertyHeader 
            property={property}
            onDeleteProperty={handleDeleteProperty}
            setDialogOpen={setDialogOpen}
            dialogOpen={dialogOpen}
          />
        )}

        {/* Simple header for temporary access */}
        {isTemporaryAccess && property && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
            <div className="flex items-center text-gray-600 mt-1">
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {property.address}
            </div>
          </div>
        )}
        
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className={`grid w-full ${isTemporaryAccess ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {!isTemporaryAccess && <TabsTrigger value="budget">Budget Management</TabsTrigger>}
            <TabsTrigger value="requests">Maintenance Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PropertyInfo property={property} />
              </div>
              
              <div className="space-y-6">
                <MaintenanceSpendCard 
                  maintenanceSpend={maintenanceSpend}
                  currentFinancialYear={currentFinancialYear}
                  budgetAnalysis={getBudgetAnalysis()}
                />
                {id && (
                  <PropertyQuickActions
                    propertyId={id}
                    onOpenEditDialog={() => setDialogOpen(true)}
                    isTemporaryAccess={isTemporaryAccess}
                  />
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="budget" className="mt-6">
            {id && !isTemporaryAccess && <BudgetManagement propertyId={id} />}
            {isTemporaryAccess && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Budget management is not available with temporary access.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="requests" className="mt-6">
            {id && <PropertyRequests requests={requests as any} propertyId={id} />}
          </TabsContent>
        </Tabs>
      </main>

      {/* Only show edit dialog for authenticated users */}
      {!isTemporaryAccess && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>
                Update the details for this property.
              </DialogDescription>
            </DialogHeader>
            <PropertyForm onClose={handleDialogClose} existingProperty={property} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PropertyDetail;
