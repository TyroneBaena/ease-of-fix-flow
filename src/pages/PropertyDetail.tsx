
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import Navbar from '@/components/Navbar';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { PropertyForm } from '@/components/property/PropertyForm';
import { PropertyHeader } from '@/components/property/PropertyHeader';
import { PropertyInfo } from '@/components/property/PropertyInfo';
import { PropertyRequests } from '@/components/property/PropertyRequests';
import { PropertyQuickActions } from '@/components/property/PropertyQuickActions';
import { LandlordInfoCard } from '@/components/property/LandlordInfoCard';
import { MaintenanceSpendCard } from '@/components/property/MaintenanceSpendCard';
import { PropertyCalendarWidget } from '@/components/property/PropertyCalendarWidget';
import { PropertyNotesWidget } from '@/components/property/PropertyNotesWidget';
import { BudgetManagement } from '@/components/property/BudgetManagement';
import { HousematesTab } from '@/components/property/housemates/HousematesTab';
import { useBudgetData } from '@/hooks/useBudgetData';
import DeletePropertyDialog from '@/components/property/DeletePropertyDialog';
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
import { usePropertyAccessControl } from '@/hooks/usePropertyAccessControl';

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
  const { getRequestsForProperty, refreshRequests } = useMaintenanceRequestContext();
  const { currentUser } = useUserContext();
  
  
  // Check for temporary session
  const [temporarySession, setTemporarySession] = useState<TemporarySession | null>(null);
  const [temporaryProperty, setTemporaryProperty] = useState<Property | null>(null);
  const [isTemporaryAccess, setIsTemporaryAccess] = useState(false);
  
  // Use context data for authenticated users, temporary data for QR access
  const property = isTemporaryAccess ? temporaryProperty : (id ? getProperty(id) : undefined);
  
  // Get requests directly from context - no need for local state since context is already memoized
  const requests = id ? getRequestsForProperty(id) : [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  // Only load budget data if we have a valid property ID
  const { maintenanceSpend, currentFinancialYear, loading: budgetLoading, getBudgetAnalysis } = useBudgetData(id || '');

  // Handle property not found - only check once after initial load
  useEffect(() => {
    // Skip all checks if user is not logged in (ProtectedRoute will handle redirect)
    if (!currentUser) return;
    
    // Skip checks during loading or for temporary access
    if (loading || isTemporaryAccess) return;
    
    // Only check if we have properties loaded and no property found
    if (id && !property && properties.length > 0) {
      console.log('PropertyDetail: Property not found, redirecting');
      toast.error('Property not found');
      navigate('/properties');
    }
  }, [id, property, properties.length, loading, isTemporaryAccess, currentUser, navigate]);

  const { handleRestrictedAction } = usePropertyAccessControl();

  const handleDeletePropertyClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (id) {
      setIsDeleting(true);
      try {
        await deleteProperty(id);
        toast.success('Property deleted successfully');
        setDeleteDialogOpen(false);
        navigate('/properties');
      } catch (error) {
        handleRestrictedAction('delete');
        toast.error('Failed to delete property');
      } finally {
        setIsDeleting(false);
      }
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
            onDeleteProperty={handleDeletePropertyClick}
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
          <TabsList className={`grid w-full ${isTemporaryAccess ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {!isTemporaryAccess && <TabsTrigger value="housemates">Housemates</TabsTrigger>}
            {!isTemporaryAccess && <TabsTrigger value="budget">Budget Management</TabsTrigger>}
            <TabsTrigger value="requests">Maintenance Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <PropertyInfo property={property} />
                {id && !isTemporaryAccess && (currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <PropertyNotesWidget propertyId={id} propertyName={property?.name || 'Property'} />
                )}
              </div>
              
              <div className="space-y-6">
                <MaintenanceSpendCard 
                  maintenanceSpend={maintenanceSpend}
                  currentFinancialYear={currentFinancialYear}
                  budgetAnalysis={getBudgetAnalysis()}
                />
                {id && !isTemporaryAccess && (
                  <PropertyCalendarWidget 
                    propertyId={id} 
                    propertyName={property?.name}
                  />
                )}
                <LandlordInfoCard landlordId={property?.landlordId} />
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
          
          <TabsContent value="housemates" className="mt-6">
            {id && !isTemporaryAccess && <HousematesTab propertyId={id} />}
          </TabsContent>
          
          <TabsContent value="budget" className="mt-6">
            {id && !isTemporaryAccess && <BudgetManagement propertyId={id} />}
          </TabsContent>
          
          <TabsContent value="requests" className="mt-6">
            {id && (
              <PropertyRequests 
                requests={requests as any} 
                propertyId={id}
                onRequestUpdated={async () => {
                  console.log('Request updated - refreshing requests');
                  await refreshRequests();
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Only show edit dialog for authenticated users */}
      {!isTemporaryAccess && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>
                Update the details for this property.
              </DialogDescription>
            </DialogHeader>
            <PropertyForm onClose={handleDialogClose} existingProperty={property} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation dialog */}
      <DeletePropertyDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        isLoading={isDeleting}
        onConfirmDelete={handleConfirmDelete}
        property={property || null}
      />
    </div>
  );
};

export default PropertyDetail;
