
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
  const [selectedContractorForDeletion, setSelectedContractorForDeletion] = useState<Contractor | null>(null);

  const handleSaveContractor = async (
    isEditMode: boolean,
    selectedContractor: Contractor | null,
    newContractor: Partial<Contractor>
  ) => {
    console.log('💾 handleSaveContractor - Starting', { isEditMode, hasSelectedContractor: !!selectedContractor });
    
    try {
      console.log('⏳ handleSaveContractor - Setting loading to true');
      setLoading(true);
      
      let success = false;
      if (isEditMode && selectedContractor) {
        console.log('✏️ handleSaveContractor - Update mode');
        success = await updateContractor(selectedContractor, newContractor);
      } else {
        console.log('➕ handleSaveContractor - Create mode');
        success = await createContractor(newContractor);
      }
      
      console.log('📊 handleSaveContractor - Operation result:', { success });
      
      if (success) {
        console.log('🔄 handleSaveContractor - Refreshing contractors list');
        // Force refresh the contractors list
        await fetchContractors();
        console.log('✅ handleSaveContractor - Completed successfully');
        return true;
      }
      console.log('⚠️ handleSaveContractor - Operation returned false');
      return false;
    } catch (err) {
      console.error('❌ handleSaveContractor - Error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save contractor');
      return false;
    } finally {
      console.log('🏁 handleSaveContractor - Finally block, setting loading to false');
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
    console.log('Setting contractor for deletion:', contractor);
    setSelectedContractorForDeletion(contractor);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteContractor = async () => {
    if (!selectedContractorForDeletion) {
      console.error('No contractor selected for deletion');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Deleting contractor:', selectedContractorForDeletion);
      await deleteContractor(selectedContractorForDeletion);
      setIsDeleteConfirmOpen(false);
      setSelectedContractorForDeletion(null);
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
    handleDeleteContractor,
    selectedContractorForDeletion
  };
};
