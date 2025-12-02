
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RequestCard from '@/components/RequestCard';
import { MaintenanceRequest } from '@/types/maintenance';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RequestListProps {
  requests: MaintenanceRequest[];
  emptyMessage?: string;
}

const RequestList: React.FC<RequestListProps> = ({ requests, emptyMessage }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { properties } = usePropertyContext();
  
  // Create property lookup map for efficiency
  const propertyMap = useMemo(() => 
    new Map(properties.map(p => [p.id, p.name])), 
    [properties]
  );
  
  // Use the already filtered requests from parent component
  const totalItems = requests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = requests.slice(startIndex, startIndex + itemsPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const getPageRange = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      if (endPage - startPage < maxVisiblePages - 3) {
        if (currentPage < totalPages / 2) {
          endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);
        } else {
          startPage = Math.max(2, endPage - (maxVisiblePages - 3));
        }
      }
      
      if (startPage > 2) {
        pages.push('ellipsis-start');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  // Reset pagination when requests change (due to filtering) or items per page changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [requests.length, itemsPerPage]);
  
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {totalItems > 0 ? (
          paginatedRequests.map(request => (
            <RequestCard 
              key={request.id} 
              request={request} 
              onClick={() => navigate(`/requests/${request.id}`)}
              propertyName={request.propertyId ? propertyMap.get(request.propertyId) : undefined}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-background rounded-lg shadow-sm">
            <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-medium text-foreground mb-1">No requests found</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {emptyMessage || "Submit a new maintenance request to get started"}
            </p>
            <Button 
              onClick={() => navigate('/new-request')}
              className="bg-primary hover:bg-primary/90"
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Request
            </Button>
          </div>
        )}
      </div>
      
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Show</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">of {totalItems} requests</span>
          </div>
          
          {totalPages > 1 && (
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
          )}
        </div>
      )}
    </div>
  );
};

export default RequestList;
