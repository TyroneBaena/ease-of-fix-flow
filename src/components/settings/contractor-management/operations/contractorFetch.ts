
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const fetchContractors = async (): Promise<Contractor[]> => {
  try {
    console.log("Fetching contractors from componentFetch...");
    const { data, error } = await supabase
      .from('contractors')
      .select('*');
      
    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    
    console.log("Raw data returned from Supabase:", data);
    
    if (data) {
      const mappedContractors: Contractor[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        companyName: item.company_name,
        contactName: item.contact_name,
        email: item.email,
        phone: item.phone,
        address: item.address || undefined,
        specialties: item.specialties || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      console.log("Mapped contractors:", mappedContractors);
      return mappedContractors;
    }
    return [];
  } catch (err) {
    console.error('Error fetching contractors:', err);
    toast.error('Failed to load contractors');
    throw err;
  }
};
