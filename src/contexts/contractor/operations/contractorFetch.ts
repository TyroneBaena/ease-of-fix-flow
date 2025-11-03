
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types/contractor';

export const fetchContractors = async (signal?: AbortSignal): Promise<Contractor[]> => {
  console.log("fetchContractors - Starting fetch from database (organization-filtered)");
  
  // SECURITY: RLS policies now handle organization filtering automatically
  // Use the safe organization function to prevent read-only transaction errors
  let query = supabase
    .from('contractors')
    .select('*')
    .order('company_name');
  
  // Only add abort signal if provided
  if (signal) {
    query = query.abortSignal(signal);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error("fetchContractors - Error fetching contractors:", error);
    throw error;
  }

  console.log(`fetchContractors - Found ${data?.length || 0} contractors in current organization:`, data);
  
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
