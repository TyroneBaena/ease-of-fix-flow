
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const fetchContractors = async (): Promise<Contractor[]> => {
  try {
    console.log("Fetching contractors from contractorFetch...");
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }
    
    console.log("Current authenticated user:", user.id);
    
    // Get user's role from profiles
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    
    console.log("User role from profile:", userProfile?.role);
    
    // Get all contractors - RLS policies will automatically handle access control
    const { data, error } = await supabase
      .from('contractors')
      .select('*');
      
    if (error) {
      console.error("Supabase error fetching contractors:", error);
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
      
      console.log("Successfully mapped contractors:", mappedContractors);
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
