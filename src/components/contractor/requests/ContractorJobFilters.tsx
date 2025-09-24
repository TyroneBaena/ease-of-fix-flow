import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowDown, ArrowUp, X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ContractorJobFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  siteFilter: string;
  setSiteFilter: (site: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  sortField: string;
  setSortField: (field: string) => void;
  sortDirection: string;
  setSortDirection: (direction: string) => void;
  categories: string[];
  sites: string[];
}

const ContractorJobFilters: React.FC<ContractorJobFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  siteFilter,
  setSiteFilter,
  priorityFilter,
  setPriorityFilter,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  categories,
  sites
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


  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSiteFilter('all');
    setPriorityFilter('all');
    setSortField('createdAt');
    setSortDirection('desc');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || 
    siteFilter !== 'all' || priorityFilter !== 'all';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jobs by title, description, or location..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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

        {/* Site Filter */}
        <div className="w-full lg:w-48">
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Site: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map(site => (
                <SelectItem key={site} value={site}>
                  {site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="w-full lg:w-48">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Priority: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
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
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="location">Location</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={toggleSortDirection}
          className="shrink-0"
        >
          {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Active Filters and Clear All */}
      <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="outline" className="bg-blue-50 border-blue-200">
              Search: {searchTerm}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 ml-2 p-0" 
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {statusFilter !== 'all' && (
            <Badge variant="outline" className="bg-green-50 border-green-200">
              Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('-', ' ')}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 ml-2 p-0" 
                onClick={() => setStatusFilter('all')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {categoryFilter !== 'all' && (
            <Badge variant="outline" className="bg-purple-50 border-purple-200">
              Category: {categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 ml-2 p-0" 
                onClick={() => setCategoryFilter('all')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {siteFilter !== 'all' && (
            <Badge variant="outline" className="bg-cyan-50 border-cyan-200">
              Site: {siteFilter}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 ml-2 p-0" 
                onClick={() => setSiteFilter('all')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {priorityFilter !== 'all' && (
            <Badge variant="outline" className="bg-orange-50 border-orange-200">
              Priority: {priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-4 w-4 ml-2 p-0" 
                onClick={() => setPriorityFilter('all')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

        </div>

        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-gray-600 hover:text-gray-800"
          >
            Clear All Filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default ContractorJobFilters;