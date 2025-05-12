
import { Contractor } from '@/types/contractor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

export const fetchContractors = async (): Promise<Contractor[]> => {
  try {
    // Check if user is authenticated before attempting to fetch
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Authentication error:", authError);
      throw authError;
    }
    
    if (!authData?.user) {
      console.log("User not authenticated, skipping contractor fetch");
      return [];
    }
    
    console.log("Fetching contractors with authenticated user:", authData.user.id);
    const { data, error } = await supabase
      .from('contractors')
      .select('*');
      
    if (error) {
      console.error("Error fetching contractors:", error);
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
        specialties: item.specialties || [],
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
    if (window.location.pathname.includes('contractor')) {
      toast.error('Failed to load contractors');
    }
    throw err;
  }
};
