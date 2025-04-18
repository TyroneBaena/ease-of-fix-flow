
import { useState } from 'react';
import { Contractor } from '@/types/contractor';
import { createContractor } from '../operations/contractorCreate';
import { updateContractor } from '../operations/contractorUpdate';
import { deleteContractor } from '../operations/contractorDelete';
import { resetContractorPassword } from '../operations/passwordReset';
import { toast } from '@/lib/toast';

export const useContractorActions = (
  fetchContractors: () => Promise<void>
) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSaveContractor = async (
    isEditMode: boolean,
    selectedContractor: Contractor | null,
    newContractor: Partial<Contractor>
  ) => {
    try {
      setLoading(true);
      
      if (isEditMode && selectedContractor) {
        await updateContractor(selectedContractor, newContractor);
      } else {
        await createContractor(newContractor);
      }
      
      await fetchContractors();
      return true;
    } catch (err) {
      console.error('Error saving contractor:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save contractor');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (contractorId: string, email: string) => {
    try {
      setLoading(true);
      await resetContractorPassword(contractorId, email);
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteContractor = (contractor: Contractor) => {
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteContractor = async (selectedContractor: Contractor | null) => {
    if (!selectedContractor) return;
    
    try {
      setLoading(true);
      await deleteContractor(selectedContractor);
      setIsDeleteConfirmOpen(false);
      await fetchContractors();
    } catch (err) {
      console.error('Error deleting contractor:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete contractor');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleSaveContractor,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor
  };
};
