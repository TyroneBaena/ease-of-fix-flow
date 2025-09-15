
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
    .maybeSingle();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    // Fall back to metadata if profile can't be fetched
  } 
  
  // If no profile exists or there was an error, fall back to metadata
  if (!profile) {
    console.log("No profile found, using metadata for user:", authUser.id);
    
    // For users without profiles, create a basic user object
    const fallbackUser = {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      role: (authUser.user_metadata?.role as UserRole) || 'manager',
      assignedProperties: authUser.user_metadata?.assignedProperties || [],
      organization_id: authUser.user_metadata?.organization_id || undefined,
      createdAt: authUser.created_at || new Date().toISOString()
    };
    
    console.warn("User has no profile record, this should not happen after account creation");
    return fallbackUser;
  }
  
  // Use profile data with better logging
  console.log('Profile found for user:', authUser.id, {
    name: profile.name,
    role: profile.role,
    organization_id: profile.organization_id,
    session_organization_id: profile.session_organization_id
  });
  
  return {
    id: profile.id,
    name: profile.name || authUser.email?.split('@')[0] || 'User',
    email: profile.email || authUser.email || '',
    role: profile.role as UserRole || 'manager',
    assignedProperties: profile.assigned_properties || [],
    organization_id: profile.organization_id || undefined,
    createdAt: profile.created_at || new Date().toISOString()
  };
};
