import React, { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserContext } from '@/contexts/UserContext';
import { filterMaintenanceRequests } from './utils/reportHelpers';
import { mockMaintenanceRequests } from './data/mockMaintenanceData';
import ReportHeader from './components/ReportHeader';
import ReportFilters from './components/ReportFilters';
import MaintenanceRequestsTable from './components/MaintenanceRequestsTable';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const MaintenanceReport = () => {
  const { properties, loading: propertiesLoading } = usePropertyContext();
  const { currentUser, isAdmin } = useUserContext();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (propertiesLoading && !initialized) {
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
  
  if (initialized && (!properties || properties.length === 0)) {
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
