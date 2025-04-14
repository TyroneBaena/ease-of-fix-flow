
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

/**
 * Converts a Supabase auth user and profile data to our application's User model
 */
export const convertToAppUser = async (authUser: any): Promise<User | null> => {
  if (!authUser) return null;
  
  // Try to get the user's profile from the profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    // Fall back to metadata if profile can't be fetched
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || '',
      email: authUser.email || '',
      role: (authUser.user_metadata?.role as UserRole) || 'manager',
      assignedProperties: authUser.user_metadata?.assignedProperties || [],
      createdAt: authUser.created_at || new Date().toISOString()
    };
  }
  
  // Use profile data
  return {
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role as UserRole || 'manager',
    assignedProperties: profile.assigned_properties || [],
    createdAt: profile.created_at || new Date().toISOString()
  };
};
