
import { useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types/contractor';
import { toast } from '@/lib/toast';
import { useContractorDialog } from './useContractorDialog';
import { useContractorActions } from './useContractorActions';
import { useContractorPagination } from './useContractorPagination';

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

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contractors')
        .select('*');

      if (error) throw error;

      const mappedContractors = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        companyName: item.company_name,
        contactName: item.contact_name,
        email: item.email,
        phone: item.phone,
        address: item.address || '',
        specialties: item.specialties || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      setContractors(mappedContractors);
      setFetchError(null);
    } catch (err) {
      console.error('Error fetching contractors:', err);
      setFetchError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
      toast.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const {
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleSaveContractor,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor
  } = useContractorActions(fetchContractors);

  useEffect(() => {
    fetchContractors();
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
    isLoading: loading,
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
    fetchContractors
  };
};
