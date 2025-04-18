
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const deleteContractor = async (contractor: Contractor) => {
  const { error } = await supabase
    .from('contractors')
    .delete()
    .eq('id', contractor.id);
    
  if (error) throw error;
  toast.success(`Contractor ${contractor.companyName} deleted successfully`);
  return true;
};
