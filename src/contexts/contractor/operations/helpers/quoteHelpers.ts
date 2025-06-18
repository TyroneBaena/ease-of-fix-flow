
import { supabase } from '@/lib/supabase';
import { PropertyDetails } from '../types/quoteTypes';

// Helper function to fetch property details for a maintenance request
export const fetchPropertyDetails = async (requestId: string): Promise<PropertyDetails | null> => {
  try {
    // First get the maintenance request to find the property_id
    const { data: request, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('property_id, site')
      .eq('id', requestId)
      .single();

    if (requestError || !request?.property_id) {
      console.log('No property_id found for request:', requestId);
      return null;
    }

    // Then fetch the property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('address, practice_leader, practice_leader_email, practice_leader_phone, contact_number, name')
      .eq('id', request.property_id)
      .single();

    if (propertyError) {
      console.error('Error fetching property details:', propertyError);
      return null;
    }

    return {
      address: property.address || '',
      practiceLeader: property.practice_leader || '',
      practiceLeaderEmail: property.practice_leader_email || '',
      practiceLeaderPhone: property.practice_leader_phone || '',
      contactNumber: property.contact_number || '',
      name: property.name || ''
    };
  } catch (error) {
    console.error('Error in fetchPropertyDetails:', error);
    return null;
  }
};
