
import React, { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { useUserContext } from '@/contexts/UserContext';
import { filterMaintenanceRequests } from './utils/reportHelpers';
import { mockMaintenanceRequests } from './data/mockMaintenanceData';
import ReportHeader from './components/ReportHeader';
import ReportFilters from './components/ReportFilters';
import MaintenanceRequestsTable from './components/MaintenanceRequestsTable';
import { Loader2 } from 'lucide-react';

const MaintenanceReport = () => {
  const { properties, loading: propertiesLoading } = usePropertyContext();
  const { currentUser, isAdmin } = useUserContext();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Set initialization state after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // If still waiting for initial data, show minimal loading
  if (!isInitialized || propertiesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span>Loading report data...</span>
      </div>
    );
  }
  
  // If properties have loaded but there are none, show a message
  if (!properties || properties.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No property data available. Please add properties first.</p>
      </div>
    );
  }
  
  // Filter properties based on user role
  const accessibleProperties = isAdmin
    ? properties 
    : properties.filter(prop => 
        currentUser?.assignedProperties?.includes(prop.id)
      );

  // Get maintenance requests (in a real app, this would come from an API)
  const maintenanceRequests = mockMaintenanceRequests;
  
  // Apply filters
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
