
import { Contractor } from '@/types/contractor';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export const fetchContractors = async (): Promise<Contractor[]> => {
  try {
    // Check if user is authenticated before attempting to fetch
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      console.log("User not authenticated, skipping contractor fetch");
      return [];
    }
    
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
    // Only show toast error if we're on a page where contractors are expected
    if (window.location.pathname.includes('dashboard') || 
        window.location.pathname.includes('settings') || 
        window.location.pathname.includes('contractor')) {
      toast.error('Failed to load contractors');
    }
    throw err;
  }
};
