
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Plus,
  Calendar,
  ArrowDown,
  ArrowUp,
  Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import RequestCard from '@/components/RequestCard';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { MaintenanceRequest } from '@/types/property';

const AllRequests = () => {
  const navigate = useNavigate();
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

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get unique categories from requests
  const categories = Array.from(new Set(allRequests.map(req => req.category.toLowerCase())));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Maintenance Requests</h1>
            <p className="text-gray-600">Manage and track all maintenance requests in one place</p>
          </div>
          <Button 
            onClick={() => navigate('/new-request')} 
            className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search requests..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <div className="w-full lg:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Category Filter */}
            <div className="w-full lg:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Sort Options */}
            <div className="w-full lg:w-48">
              <Select value={sortField} onValueChange={(value) => handleSort(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="updatedAt">Date Updated</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleSortDirection}
            >
              {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="outline" className="bg-gray-100">
                Search: {searchTerm}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 ml-2 p-0" 
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="bg-gray-100">
                Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 ml-2 p-0" 
                  onClick={() => setStatusFilter('all')}
                >
                  ×
                </Button>
              </Badge>
            )}
            
            {categoryFilter !== 'all' && (
              <Badge variant="outline" className="bg-gray-100">
                Category: {categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 ml-2 p-0" 
                  onClick={() => setCategoryFilter('all')}
                >
                  ×
                </Button>
              </Badge>
            )}
          </div>
        </div>
        
        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
        </div>
        
        {/* Request List */}
        <div className="space-y-4">
          {filteredRequests.length > 0 ? (
            filteredRequests.map(request => (
              <RequestCard 
                key={request.id} 
                request={request} 
                onClick={() => navigate(`/requests/${request.id}`)} 
              />
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No requests found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? "Try adjusting your filters"
                  : "Submit a new maintenance request to get started"}
              </p>
              <Button 
                onClick={() => navigate('/new-request')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AllRequests;
