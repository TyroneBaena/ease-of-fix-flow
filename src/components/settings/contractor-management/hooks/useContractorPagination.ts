
import { useState } from 'react';

export const CONTRACTORS_PER_PAGE = 10;

export const useContractorPagination = (totalItems: number) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / CONTRACTORS_PER_PAGE));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    currentPage,
    totalPages,
    CONTRACTORS_PER_PAGE,
    handlePageChange
  };
};
