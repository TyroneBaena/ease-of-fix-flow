
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RequestCard from '@/components/RequestCard';
import { MaintenanceRequest, Property } from '@/types/property';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { usePropertyContext } from '@/contexts/PropertyContext';

interface RequestListProps {
  requests: MaintenanceRequest[];
  emptyMessage?: string;
}

const RequestList: React.FC<RequestListProps> = ({ requests, emptyMessage }) => {
  const navigate = useNavigate();
  const { properties } = usePropertyContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Items per page
  const itemsPerPage = 5;
  
  // Apply filters
  let filteredRequests = [...requests];
  
  if (propertyFilter !== 'all') {
    filteredRequests = filteredRequests.filter(req => req.propertyId === propertyFilter);
  }
  
  if (statusFilter !== 'all') {
    filteredRequests = filteredRequests.filter(req => req.status === statusFilter);
  }

  // Calculate pagination values
  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Generate page numbers for pagination
  const getPageRange = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // If we have fewer pages than max visible, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);
      
      // Calculate range around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust range to ensure we show maxVisiblePages - 2 (accounting for first and last pages)
      if (endPage - startPage < maxVisiblePages - 3) {
        if (currentPage < totalPages / 2) {
          endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);
        } else {
          startPage = Math.max(2, endPage - (maxVisiblePages - 3));
        }
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('ellipsis-start');
      }
      
      // Add pages in range
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      
      // Always include last page
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      {requests.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(property => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Request list */}
      <div className="space-y-4">
        {totalItems > 0 ? (
          paginatedRequests.map(request => (
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
              {emptyMessage || "Submit a new maintenance request to get started"}
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
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} 
                />
              </PaginationItem>
              
              {getPageRange().map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink 
                      isActive={currentPage === page}
                      onClick={() => handlePageChange(page as number)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default RequestList;
