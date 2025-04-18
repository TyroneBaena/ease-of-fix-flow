
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const fetchContractors = async (): Promise<Contractor[]> => {
  try {
    console.log("Fetching contractors from contractorFetch...");
    
    // Log auth status to verify if the user is authenticated properly
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current authenticated user:", user?.id);
    
    // First, attempt to get all contractors with detailed logging
    const { data, error, status } = await supabase
      .from('contractors')
      .select('*');
      
    if (error) {
      console.error("Supabase error fetching contractors:", error);
      console.error("Status code:", status);
      throw error;
    }
    
    // Log the raw response for debugging
    console.log("Raw contractors data:", data);
    console.log("Number of contractors found:", data?.length || 0);
    
    if (data && data.length > 0) {
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
    } else {
      console.log("No contractors found in the database");
      return [];
    }
  } catch (err) {
    console.error('Error fetching contractors:', err);
    toast.error('Failed to load contractors');
    throw err;
  }
};
