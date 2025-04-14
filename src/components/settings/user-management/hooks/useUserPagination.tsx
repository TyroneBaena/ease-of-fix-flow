
import { useState, useMemo, useCallback } from 'react';

export const USERS_PER_PAGE = 5;

export const useUserPagination = (userCount: number) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate total pages based on user count
  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(userCount / USERS_PER_PAGE)),
    [userCount]
  );
  
  // Handle page changes with validation
  const handlePageChange = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  }, [totalPages]);
  
  // Make sure currentPage stays valid when totalPages changes
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  
  return {
    currentPage,
    totalPages,
    USERS_PER_PAGE,
    handlePageChange
  };
};
