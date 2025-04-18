
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const createContractor = async (newContractor: Partial<Contractor>) => {
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
    return true;
  } else {
    throw new Error(data.message || 'Failed to invite contractor');
  }
};
