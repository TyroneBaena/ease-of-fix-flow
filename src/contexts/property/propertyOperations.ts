
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/property';
import { toast } from '@/lib/toast';

// Fetch properties from Supabase
export const fetchProperties = async (): Promise<Property[]> => {
  console.log('Fetching properties with clean RLS policies');
  
  const { data, error } = await supabase
    .from('properties')
    .select('*');

  if (error) {
    console.error('Error fetching properties:', error);
    toast.error('Failed to fetch properties');
    throw error;
  }

  console.log('Properties fetched successfully:', data?.length || 0);

  // Format properties to match our Property type
  const rows = (data as any[]);
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
