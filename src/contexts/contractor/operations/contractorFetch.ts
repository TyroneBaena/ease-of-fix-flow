
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types/contractor';

export const fetchContractors = async (): Promise<Contractor[]> => {
  console.log("fetchContractors - Starting fetch from database");
  
  const { data, error } = await supabase
    .from('contractors')
    .select('*');

  if (error) {
    console.error("fetchContractors - Error fetching contractors:", error);
    throw error;
  }

  console.log("fetchContractors - Raw data from database:", data);
  
  // Map the snake_case database fields to camelCase for our TypeScript interfaces
  return data.map(item => ({
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
};
