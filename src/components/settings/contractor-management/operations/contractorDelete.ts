
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const deleteContractor = async (contractor: Contractor) => {
  try {
    // First, delete all quotes associated with this contractor
    const { error: quotesError } = await supabase
      .from('quotes')
      .delete()
      .eq('contractor_id', contractor.id);
    
    if (quotesError) {
      console.error('Error deleting contractor quotes:', quotesError);
      throw new Error('Failed to delete contractor quotes');
    }
    
    // Then delete the contractor
    const { error: contractorError } = await supabase
      .from('contractors')
      .delete()
      .eq('id', contractor.id);
      
    if (contractorError) {
      console.error('Error deleting contractor:', contractorError);
      throw contractorError;
    }
    
    toast.success(`Contractor ${contractor.companyName} and all associated quotes deleted successfully`);
    return true;
  } catch (error) {
    console.error('Delete contractor operation failed:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('foreign key constraint')) {
        toast.error('Cannot delete contractor: They have active maintenance requests or quotes. Please reassign or complete those first.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.error('Failed to delete contractor');
    }
    
    throw error;
  }
};
