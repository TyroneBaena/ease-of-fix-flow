
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

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
        const { error } = await supabase
          .from('contractors')
          .update({
            company_name: newContractor.companyName,
            contact_name: newContractor.contactName,
            email: newContractor.email,
            phone: newContractor.phone,
            address: newContractor.address || null,
            specialties: newContractor.specialties || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedContractor.id);
          
        if (error) throw error;
        toast.success('Contractor updated successfully');
      } else {
        const { data, error } = await supabase.functions.invoke('invite-contractor', {
          body: {
            email: newContractor.email,
            companyName: newContractor.companyName,
            contactName: newContractor.contactName,
            phone: newContractor.phone,
            address: newContractor.address || null,
            specialties: newContractor.specialties || []
          }
        });
        
        if (error) throw error;
        
        if (data.success) {
          toast.success(`Invitation sent to ${newContractor.email}`);
          
          if (data.testMode) {
            toast.info('Note: Email was sent in test mode');
          }
        } else {
          throw new Error(data.message || 'Failed to invite contractor');
        }
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
      
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('user_id')
        .eq('id', contractorId)
        .single();
        
      if (contractorError) throw contractorError;
      
      if (!contractorData?.user_id) {
        throw new Error('Could not find user account for this contractor');
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (error) throw error;
      
      toast.success(`Password reset email sent to ${email}`);
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
      
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', selectedContractor.id);
        
      if (error) throw error;
      
      toast.success(`Contractor ${selectedContractor.companyName} deleted successfully`);
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
