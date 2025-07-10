
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { MaintenanceRequest } from '@/types/maintenance';
import RequestsHeader from '@/components/requests/RequestsHeader';
import RequestFilters from '@/components/requests/RequestFilters';
import RequestList from '@/components/requests/RequestList';
import { isWithinInterval, parseISO } from 'date-fns';

const AllRequests = () => {
  const { properties } = usePropertyContext();
  const { requests, loading } = useMaintenanceRequestContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: undefined, 
    to: undefined 
  });
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);

  // Log what we're working with
  useEffect(() => {
    console.log('AllRequests - Properties:', properties);
    console.log('AllRequests - Requests:', requests);
    console.log('AllRequests - Loading state:', loading);
  }, [properties, requests, loading]);

  // Filter and sort requests
  useEffect(() => {
    if (!requests || requests.length === 0) {
      console.log('No maintenance requests available');
      setFilteredRequests([]);
      return;
    }

    let result = [...requests];
    console.log('Filtering requests, count before:', result.length);
    
    if (searchTerm) {
      result = result.filter(request => {
        const title = request.title || request.issueNature || '';
        const description = request.description || request.explanation || '';
        return title.toLowerCase().includes(searchTerm.toLowerCase()) || 
               description.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(request => request.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      const category = categoryFilter.toLowerCase();
      result = result.filter(request => 
        (request.category?.toLowerCase() === category) || 
        (request.site?.toLowerCase() === category)
      );
    }

    // Date range filtering - using createdAt instead of created_at
    if (dateRange.from || dateRange.to) {
      result = result.filter(request => {
        if (!request.createdAt) return false;
        
        const requestDate = typeof request.createdAt === 'string' 
          ? parseISO(request.createdAt) 
          : new Date(request.createdAt);
        
        if (dateRange.from && dateRange.to) {
          return isWithinInterval(requestDate, { start: dateRange.from, end: dateRange.to });
        } else if (dateRange.from) {
          return requestDate >= dateRange.from;
        } else if (dateRange.to) {
          return requestDate <= dateRange.to;
        }
        
        return true;
      });
    }
    
    console.log('Sorting requests by:', sortField, sortDirection);
    result.sort((a, b) => {
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        const dateA = new Date(a[sortField] || '').getTime();
        const dateB = new Date(b[sortField] || '').getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      const valueA = (a[sortField as keyof MaintenanceRequest] as string) || '';
      const valueB = (b[sortField as keyof MaintenanceRequest] as string) || '';
      return sortDirection === 'asc' 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    });
    
    console.log('Filtered requests count:', result.length);
    setFilteredRequests(result);
  }, [searchTerm, statusFilter, categoryFilter, sortField, sortDirection, dateRange, requests]);

  // Get unique categories from requests
  const categories = Array.from(
    new Set(
      requests
        .map(req => (req.category || req.site || '').toLowerCase())
        .filter(Boolean)
    )
  );

  // Message to display when no requests are found
  const getEmptyMessage = () => {
    if (loading) return "Loading requests...";
    if (requests.length === 0) return "No maintenance requests found. Submit a new request to get started.";
    if (searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || dateRange.from || dateRange.to) {
      return "No requests match your filters. Try adjusting your search criteria.";
    }
    return "No maintenance requests found";
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
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
        
        <div className="mb-4 text-sm text-gray-600">
          {loading ? (
            "Loading requests..."
          ) : (
            `Showing ${filteredRequests.length} ${filteredRequests.length === 1 ? 'request' : 'requests'}`
          )}
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
