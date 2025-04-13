
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { MaintenanceRequest } from '@/types/property';
import RequestsHeader from '@/components/requests/RequestsHeader';
import RequestFilters from '@/components/requests/RequestFilters';
import RequestList from '@/components/requests/RequestList';

const AllRequests = () => {
  const { properties, getRequestsForProperty } = usePropertyContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [allRequests, setAllRequests] = useState<MaintenanceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);

  // Collect all requests from all properties
  useEffect(() => {
    const requests: MaintenanceRequest[] = [];
    properties.forEach(property => {
      const propertyRequests = getRequestsForProperty(property.id);
      requests.push(...propertyRequests);
    });
    setAllRequests(requests);
  }, [properties, getRequestsForProperty]);

  // Filter and sort requests
  useEffect(() => {
    let result = [...allRequests];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(request => 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        request.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(request => request.status === statusFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(request => request.category.toLowerCase() === categoryFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        const aValue = new Date(a[sortField]).getTime();
        const bValue = new Date(b[sortField]).getTime();
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle other fields
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    });
    
    setFilteredRequests(result);
  }, [searchTerm, statusFilter, categoryFilter, sortField, sortDirection, allRequests]);

  // Get unique categories from requests
  const categories = Array.from(new Set(allRequests.map(req => req.category.toLowerCase())));

  // Get empty message based on filters
  const getEmptyMessage = () => {
    if (searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') {
      return "Try adjusting your filters";
    }
    return "Submit a new maintenance request to get started";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequestsHeader 
          title="All Maintenance Requests" 
          subtitle="Manage and track all maintenance requests in one place"
        />
        
        <RequestFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          sortField={sortField}
          setSortField={setSortField}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
          categories={categories}
        />
        
        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
        </div>
        
        <RequestList
          requests={filteredRequests}
          emptyMessage={getEmptyMessage()}
        />
      </main>
    </div>
  );
};

export default AllRequests;
