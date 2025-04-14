
import React, { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/property';
import { useUserContext } from '@/contexts/UserContext';
import { filterMaintenanceRequests } from './utils/reportHelpers';
import { mockMaintenanceRequests } from './data/mockMaintenanceData';
import ReportHeader from './components/ReportHeader';
import ReportFilters from './components/ReportFilters';
import MaintenanceRequestsTable from './components/MaintenanceRequestsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

const MaintenanceReport = () => {
  const { properties, loading: propertiesLoading, loadingFailed } = usePropertyContext();
  const { currentUser, isAdmin } = useUserContext();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stableLoadingState, setStableLoadingState] = useState(true);
  
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

  // Show skeleton while loading
  if (stableLoadingState) {
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
  if (loadingFailed) {
    return (
      <div className="py-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Data Loading Error</AlertTitle>
          <AlertDescription>
            Unable to load property data. Please try refreshing the page.
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
  
  const accessibleProperties = isAdmin
    ? properties 
    : properties.filter(prop => 
        currentUser?.assignedProperties?.includes(prop.id)
      );

  const maintenanceRequests = mockMaintenanceRequests;
  
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
  
  return (
    <div>
      <ReportHeader 
        filteredRequests={filteredRequests}
        getPropertyName={getPropertyName}
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
    </div>
  );
};

export default MaintenanceReport;
