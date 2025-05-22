
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Contractor } from '@/types/contractor';

export const updateContractor = async (contractor: Contractor, updates: Partial<Contractor>) => {
  try {
    const { error } = await supabase
      .from('contractors')
      .update({
        company_name: updates.companyName,
        contact_name: updates.contactName,
        email: updates.email,
        phone: updates.phone,
        address: updates.address || null,
        specialties: updates.specialties || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', contractor.id);
      
    if (error) throw error;
    
    toast.success('Contractor updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating contractor:', error);
    toast.error('Failed to update contractor');
    return false;
  }
};
