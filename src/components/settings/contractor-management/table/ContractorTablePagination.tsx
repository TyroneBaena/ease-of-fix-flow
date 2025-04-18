
import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ContractorTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const ContractorTablePagination = ({
  currentPage,
  totalPages,
  onPageChange
}: ContractorTablePaginationProps) => {
  // If there's only 1 or no page, don't show pagination
  if (totalPages <= 1) return null;

  const visiblePageNumbers = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
        
        {visiblePageNumbers.map((pageNum, idx) => (
          pageNum === '...' ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => onPageChange(pageNum as number)}
                isActive={pageNum === currentPage}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          )
        ))}

        <PaginationItem>
          <PaginationNext 
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

// Helper function to determine which page numbers to display
function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    // If there are 7 or fewer pages, show all page numbers
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  if (currentPage <= 3) {
    // Near the start
    return [1, 2, 3, 4, 5, '...', totalPages];
  } else if (currentPage >= totalPages - 2) {
    // Near the end
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  } else {
    // Middle case: show current page with neighbors and ellipses
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }
}

export default ContractorTablePagination;
