
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/property';
import { toast } from '@/lib/toast';

// Fetch properties from Supabase
export const fetchProperties = async (signal?: AbortSignal): Promise<Property[]> => {
  console.log('PropertyOperations: Starting to fetch properties with clean RLS policies');
  
  let query = supabase.from('properties').select('*');
  
  // Only add abort signal if provided
  if (signal) {
    query = query.abortSignal(signal);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('PropertyOperations: Error fetching properties:', error);
    toast.error('Failed to fetch properties');
    throw error;
  }

  console.log('PropertyOperations: Raw data from database:', data);
  console.log('PropertyOperations: Properties fetched successfully:', data?.length || 0);

  // Format properties to match our Property type
  const rows = (data as any[]);
  console.log('PropertyOperations: Processing rows:', rows);
  const formattedProperties: Property[] = rows.map((prop: any) => ({
    id: prop.id,
    name: prop.name,
    address: prop.address,
    contactNumber: prop.contact_number,
    email: prop.email,
    practiceLeader: prop.practice_leader,
    practiceLeaderEmail: prop.practice_leader_email || '',
    practiceLeaderPhone: prop.practice_leader_phone || '',
    renewalDate: prop.renewal_date ? new Date(prop.renewal_date).toISOString() : '',
    rentAmount: Number(prop.rent_amount) || 0,
    rentPeriod: (prop.rent_period as 'week' | 'month') || 'month',
    createdAt: prop.created_at,
    landlordId: prop.landlord_id || undefined,
  }));

  console.log('PropertyOperations: Formatted properties:', formattedProperties.map(p => ({ id: p.id, name: p.name })));
  return formattedProperties;
};

// Map our Property type to Supabase schema
export const mapPropertyToSupabase = (property: Omit<Property, 'id' | 'createdAt'>, userId: string) => {
  return {
    name: property.name,
    address: property.address,
    contact_number: property.contactNumber,
    email: property.email,
    practice_leader: property.practiceLeader,
    practice_leader_email: property.practiceLeaderEmail,
    practice_leader_phone: property.practiceLeaderPhone,
    renewal_date: property.renewalDate || null,
    rent_amount: property.rentAmount,
    rent_period: property.rentPeriod,
    user_id: userId,
    landlord_id: property.landlordId ?? null,
  };
};
