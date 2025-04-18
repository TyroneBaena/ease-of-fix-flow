
import { useState, useCallback, useEffect } from 'react';
import { Contractor } from '@/types/contractor';
import { useUserContext } from '@/contexts/UserContext';
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

  // Initialize the contractor actions
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

  const loadContractors = async () => {
    try {
      setLoading(true);
      console.log("Fetching contractors in useContractorManagement...");
      
      // Debug: Log the raw data from Supabase directly
      const { data: rawData, error } = await supabase
        .from('contractors')
        .select('*');
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      
      console.log("Raw data from contractors table:", rawData);
      
      // Still use the fetchContractors function for consistent mapping
      const data = await fetchContractors();
      setContractors(data);
      setFetchError(null);
    } catch (err) {
      console.error("Error loading contractors:", err);
      setFetchError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
    } finally {
      setLoading(false);
    }
  };

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
    fetchContractors: loadContractors
  };
};
