import { useState, useCallback, useEffect } from 'react';
import { Contractor } from '@/types/contractor';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { useContractorDialog } from './useContractorDialog';
import { useContractorActions } from './useContractorActions';
import { useContractorPagination } from './useContractorPagination';
import { useSettingsContractors } from '@/hooks/settings/useSettingsContractors';

/**
 * v80.0 - Updated to use React Query hook for Contractor Management
 * 
 * FIXES TWO ISSUES:
 * 1. Multiple API calls on tab click - React Query deduplication
 * 2. No fetch on tab return - React Query refetchOnWindowFocus
 */

export const useContractorManagement = () => {
  const { currentUser, isAdmin, session } = useSimpleAuth();
  const [ready, setReady] = useState(false);

  console.log('🔧 v80.0 - useContractorManagement - Hook state:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    hasCurrentUser: !!currentUser,
  });

  // v80.0: Use React Query hook for automatic refetch on window focus and deduplication
  const { contractors, loading, error: fetchError, refetch } = useSettingsContractors({ 
    enabled: isAdmin 
  });
  
  // Wrapper function for compatibility with existing code
  const loadContractors = useCallback(async () => {
    console.log("🔄 v80.0 - loadContractors - Triggering refetch via React Query");
    await refetch();
  }, [refetch]);

  const {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedContractor,
    newContractor,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange,
    isPreparingDialog
  } = useContractorDialog(session);

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

  // v80.0: Set ready once we have basic data
  useEffect(() => {
    if (isAdmin && (contractors.length > 0 || !loading)) {
      console.log('✅ v80.0 - useContractorManagement - System ready for operations');
      setReady(true);
    }
  }, [isAdmin, contractors.length, loading]);

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
    selectedContractorForDeletion,
    ready,
    isPreparingDialog
  };
};
