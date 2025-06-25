import React, { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/property';
import { useUserContext } from '@/contexts/UserContext';
import { filterMaintenanceRequests } from './utils/reportHelpers';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/property';
import ReportHeader from './components/ReportHeader';
import ReportFilters from './components/ReportFilters';
import MaintenanceRequestsTable from './components/MaintenanceRequestsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { toast } from '@/lib/toast';

const MaintenanceReport = () => {
  const { properties, loading: propertiesLoading, loadingFailed } = usePropertyContext();
  const { currentUser, isAdmin } = useUserContext();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stableLoadingState, setStableLoadingState] = useState(true);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  
  // Improved stable loading state management
  useEffect(() => {
    console.log("MaintenanceReport: Loading state check", { propertiesLoading, properties });
    
    // Start with loading state
    setStableLoadingState(true);
    
    // Short delay for state to stabilize
    const initialDelay = setTimeout(() => {
      if (!propertiesLoading) {
        console.log("MaintenanceReport: Properties loaded, exiting loading state");
        // Set stable loading state to false after short delay to prevent flashing
        setTimeout(() => setStableLoadingState(false), 100);
      }
    }, 300);
    
    // Hard timeout to prevent infinite loading
    const backupTimeout = setTimeout(() => {
      if (stableLoadingState) {
        console.log("MaintenanceReport: Forcing exit from loading state after timeout");
        setStableLoadingState(false);
      }
    }, 3000);
    
    return () => {
      clearTimeout(initialDelay);
      clearTimeout(backupTimeout);
    };
  }, [properties, propertiesLoading]);

  // Fetch actual maintenance requests from the database with proper access control
  useEffect(() => {
    if (stableLoadingState || !currentUser) {
      return;
    }
    
    const fetchMaintenanceRequests = async () => {
      setIsLoadingRequests(true);
      setRequestsError(null);
      
      try {
        console.log("Fetching maintenance requests from the database");
        
        // Build the query based on user role with enhanced access control
        let query = supabase
          .from('maintenance_requests')
          .select('*')
          .order('created_at', { ascending: false });
        
        // Apply strict property-based filtering for managers
        if (currentUser.role === 'manager' && currentUser.assignedProperties?.length > 0) {
          // Managers can only see requests for their assigned properties
          query = query.in('property_id', currentUser.assignedProperties);
        } else if (!isAdmin) {
          // Non-admin, non-manager users can only see their own requests
          query = query.eq('user_id', currentUser.id);
        }
        // Admins can see all requests (no additional filtering)
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching maintenance requests:", error);
          setRequestsError("Failed to load maintenance requests");
          toast.error("Error loading maintenance request data");
          setMaintenanceRequests([]);
        } else {
          console.log("Maintenance requests loaded:", data?.length);
          // Format the data to match our MaintenanceRequest type
          const formattedRequests = data.map(request => ({
            id: request.id,
            title: request.title || request.issue_nature || "Untitled",
            issueNature: request.issue_nature || request.title || "Untitled",
            description: request.description || request.explanation || "",
            explanation: request.explanation || request.description || "",
            category: request.category || request.site || "",
            site: request.site || request.category || "",
            location: request.location || "",
            propertyId: request.property_id,
            priority: request.priority || "medium",
            status: request.status || "pending",
            createdAt: request.created_at,
            updatedAt: request.updated_at,
            submittedBy: request.submitted_by || "Anonymous",
            isParticipantRelated: request.is_participant_related || false,
            participantName: request.participant_name || ""
          })) as MaintenanceRequest[];
          
          setMaintenanceRequests(formattedRequests);
        }
      } catch (error) {
        console.error("Unexpected error fetching maintenance requests:", error);
        setRequestsError("An unexpected error occurred");
        toast.error("Failed to load report data");
        setMaintenanceRequests([]);
      } finally {
        setIsLoadingRequests(false);
      }
    };
    
    fetchMaintenanceRequests();
  }, [currentUser, isAdmin, stableLoadingState]);

  // Show skeleton while loading
  if (stableLoadingState || isLoadingRequests) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col space-y-3">
          <Skeleton className="h-8 w-full max-w-[300px]" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }
  
  // Show error state if loading failed
  if (loadingFailed || requestsError) {
    return (
      <div className="py-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Data Loading Error</AlertTitle>
          <AlertDescription>
            {requestsError || "Unable to load property data. Please try refreshing the page."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Handle case when properties is undefined or empty
  if (!properties || properties.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No property data available. Please add properties first.</p>
      </div>
    );
  }
  
  // Filter accessible properties based on user role
  const accessibleProperties = isAdmin
    ? properties 
    : properties.filter(prop => 
        currentUser?.assignedProperties?.includes(prop.id)
      );

  const filteredRequests = filterMaintenanceRequests(
    maintenanceRequests,
    propertyFilter,
    statusFilter,
    searchTerm,
    isAdmin,
    currentUser?.assignedProperties
  );
  
  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
  };
  
  // Prepare current filter state for export
  const currentFilters = {
    propertyFilter,
    statusFilter,
    searchTerm
  };
  
  return (
    <div>
      <ReportHeader 
        filteredRequests={filteredRequests}
        getPropertyName={getPropertyName}
        currentFilters={currentFilters}
      />
      
      <ReportFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        propertyFilter={propertyFilter}
        setPropertyFilter={setPropertyFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        accessibleProperties={accessibleProperties}
      />
      
      <MaintenanceRequestsTable 
        filteredRequests={filteredRequests}
        getPropertyName={getPropertyName}
      />
      
      {maintenanceRequests.length > 0 && filteredRequests.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-500">No maintenance requests match your current filters.</p>
        </div>
      )}
      
      {maintenanceRequests.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-500">
            {currentUser?.role === 'manager' 
              ? "No maintenance requests found for your assigned properties."
              : "No maintenance requests found in the database."}
          </p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceReport;
