
import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface UserTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const UserTablePagination: React.FC<UserTablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  const getPageNumbers = () => {
    const pages = [];
    if (currentPage > 2) {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
    }
    
    if (currentPage > 1) {
      pages.push(currentPage - 1);
    }
    
    pages.push(currentPage);
    
    if (currentPage < totalPages) {
      pages.push(currentPage + 1);
    }
    
    if (currentPage < totalPages - 1) {
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="mt-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(currentPage - 1)} 
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              href="#" 
            />
          </PaginationItem>

          {getPageNumbers().map((page, index) => (
            <PaginationItem key={index}>
              {page === 'ellipsis' ? (
                <PaginationLink href="#" onClick={(e) => e.preventDefault()}>
                  ...
                </PaginationLink>
              ) : (
                <PaginationLink 
                  href="#" 
                  isActive={page === currentPage}
                  onClick={(e) => {
                    e.preventDefault(); 
                    onPageChange(page as number);
                  }}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(currentPage + 1)} 
              className={currentPage === totalPages || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              href="#" 
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default UserTablePagination;
