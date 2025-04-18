
import { Contractor } from '@/types/contractor';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export const fetchContractors = async (): Promise<Contractor[]> => {
  try {
    console.log("Fetching contractors...");
    const { data, error } = await supabase
      .from('contractors')
      .select('*');
      
    if (error) {
      throw error;
    }
    
    if (data) {
      const mappedContractors: Contractor[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        companyName: item.company_name,
        contactName: item.contact_name,
        email: item.email,
        phone: item.phone,
        address: item.address || undefined,
        specialties: item.specialties || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      console.log("Fetched contractors:", mappedContractors);
      return mappedContractors;
    }
    return [];
  } catch (err) {
    console.error('Error fetching contractors:', err);
    toast.error('Failed to load contractors');
    throw err;
  }
};

