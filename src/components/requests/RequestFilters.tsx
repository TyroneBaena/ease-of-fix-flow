
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowDown, ArrowUp } from 'lucide-react';

interface RequestFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  sortField: string;
  setSortField: (field: string) => void;
  sortDirection: string;
  setSortDirection: (direction: string) => void;
  categories: string[];
}

const RequestFilters: React.FC<RequestFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  categories
}) => {
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

  return (
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
              <SelectValue placeholder="Property: All" />
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
  );
};

export default RequestFilters;
