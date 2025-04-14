
import React, { useState } from 'react';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { useUserContext } from '@/contexts/UserContext';
import { filterMaintenanceRequests } from './utils/reportHelpers';
import { mockMaintenanceRequests } from './data/mockMaintenanceData';
import ReportHeader from './components/ReportHeader';
import ReportFilters from './components/ReportFilters';
import MaintenanceRequestsTable from './components/MaintenanceRequestsTable';
import { Loader2 } from 'lucide-react';

const MaintenanceReport = () => {
  const { properties } = usePropertyContext();
  const { currentUser, isAdmin } = useUserContext();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // If properties aren't loaded yet, show loading
  if (!properties || properties.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span>Loading property data...</span>
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
