
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, ArrowDown, ArrowUp, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { Property } from '@/types/property';

interface RequestFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  propertyFilter: string;
  setPropertyFilter: (propertyId: string) => void;
  properties: Property[];
  sortField: string;
  setSortField: (field: string) => void;
  sortDirection: string;
  setSortDirection: (direction: string) => void;
  dateRange?: { from: Date | undefined; to: Date | undefined };
  setDateRange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

const RequestFilters: React.FC<RequestFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  propertyFilter,
  setPropertyFilter,
  properties,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  dateRange,
  setDateRange
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

  const clearDateRange = () => {
    if (setDateRange) {
      setDateRange({ from: undefined, to: undefined });
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Property Filter */}
        <div className="w-full lg:w-48">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Property: All" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50 max-h-60">
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(property => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        {setDateRange && (
          <div className="w-full lg:w-64">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange?.from && !dateRange?.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
        
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
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
        
        {statusFilter !== 'all' && (
          <Badge variant="outline" className="bg-gray-100">
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
        
        {propertyFilter !== 'all' && (
          <Badge variant="outline" className="bg-gray-100">
            Property: {properties.find(p => p.id === propertyFilter)?.name || propertyFilter}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 ml-2 p-0" 
              onClick={() => setPropertyFilter('all')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {dateRange?.from && setDateRange && (
          <Badge variant="outline" className="bg-gray-100">
            Date: {dateRange.to ? 
              `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}` : 
              format(dateRange.from, "MMM d")
            }
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 ml-2 p-0" 
              onClick={clearDateRange}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
      </div>
    </div>
  );
};

export default RequestFilters;
