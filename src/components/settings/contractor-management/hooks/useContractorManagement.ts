
import { useState, useCallback, useEffect } from 'react';
import { Contractor } from '@/types/contractor';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { useContractorDialog } from './useContractorDialog';
import { useContractorActions } from './useContractorActions';
import { useContractorPagination } from './useContractorPagination';
import { fetchContractors } from '../operations/contractorFetch';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

export const useContractorManagement = () => {
  const { currentUser, isAdmin } = useUserContext();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  console.log('🔧 useContractorManagement - Hook state:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    hasCurrentUser: !!currentUser,
    loading
  });

  const {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedContractor,
    newContractor,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange
  } = useContractorDialog();

  const {
    currentPage,
    totalPages,
    CONTRACTORS_PER_PAGE,
    handlePageChange
  } = useContractorPagination(contractors.length);

  // Define loadContractors function first before using it
  const loadContractors = async () => {
    try {
      setLoading(true);
      console.log("Fetching contractors in useContractorManagement...");
      console.log("User is admin:", isAdmin);
      
      // Check if there are any RLS policies that might be blocking the request
      console.log("Attempting to fetch contractors directly from Supabase...");
      
      // Detailed debug logging for Supabase query
      const { data: rawData, error, count } = await supabase
        .from('contractors')
        .select('*', { count: 'exact' });
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      
      console.log("Raw contractors count from direct query:", count);
      console.log("Raw data from contractors table:", rawData);
      
      // Use the fetchContractors function for consistent mapping
      const data = await fetchContractors();
      console.log("Contractors after mapping:", data);
      
      setContractors(data);
      setFetchError(null);
      
      if (data.length === 0) {
        console.log("No contractors were returned after fetching");
      }
    } catch (err) {
      console.error("Error loading contractors:", err);
      setFetchError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
    } finally {
      setLoading(false);
    }
  };

  // Initialize the contractor actions after loadContractors is defined
  const {
    loading: actionLoading,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleSaveContractor,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor,
    selectedContractorForDeletion
  } = useContractorActions(loadContractors);

  useEffect(() => {
    loadContractors();
  }, []);

  const handleSave = async () => {
    const success = await handleSaveContractor(isEditMode, selectedContractor, newContractor);
    if (success) {
      setIsDialogOpen(false);
    }
  };

  return {
    contractors,
    currentUser,
    isAdmin,
    isLoading: loading || actionLoading,
    fetchError,
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    newContractor,
    selectedContractor,
    currentPage,
    totalPages,
    CONTRACTORS_PER_PAGE,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange,
    handleSaveContractor: handleSave,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor,
    handlePageChange,
    fetchContractors: loadContractors,
    selectedContractorForDeletion
  };
};
