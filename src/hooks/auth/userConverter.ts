
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

/**
 * Converts a Supabase auth user and profile data to our application's User model
 */
export const convertToAppUser = async (authUser: any): Promise<User> => {
  console.log('convertToAppUser called with:', {
    hasAuthUser: !!authUser,
    userId: authUser?.id,
    email: authUser?.email
  });
  
  if (!authUser?.id || !authUser?.email) {
    console.log('convertToAppUser: Invalid auth user provided');
    // Return a basic fallback user instead of null to prevent loading issues
    return {
      id: authUser?.id || 'unknown',
      name: authUser?.email?.split('@')[0] || 'User',
      email: authUser?.email || 'unknown@example.com',
      role: 'manager',
      assignedProperties: [],
      createdAt: new Date().toISOString()
    };
  }
  
  console.log('Fetching profile for user:', authUser.id);
  
  try {
    console.log('Starting profile fetch for user:', authUser.id);
    
    // Use Promise.race to implement a proper timeout that prevents hanging
    const startTime = Date.now();
    
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout after 5 seconds')), 5000)
    );
    
    const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
    
    const duration = Date.now() - startTime;
    console.log(`Profile fetch completed in ${duration}ms`);
    
    console.log('Profile lookup result:', {
      hasProfile: !!profile,
      error: error?.message,
      fetchDuration: 'completed',
      profileData: profile ? {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        organization_id: profile.organization_id
      } : null
    });
    
    if (error) {
      console.error("Error fetching user profile:", error);
      // For timeout errors, create a basic fallback immediately
      if (error.message.includes('timeout')) {
        console.warn("Profile fetch timed out, creating fallback user");
        return {
          id: authUser.id,
          name: authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          role: 'manager' as UserRole,
          assignedProperties: [],
          createdAt: authUser.created_at || new Date().toISOString()
        };
      }
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
      console.log('Returning fallback user:', fallbackUser);
      return fallbackUser;
    }
    
    // Use profile data with better logging
    console.log('Profile found for user:', authUser.id, {
      name: profile.name,
      role: profile.role,
      organization_id: profile.organization_id,
      session_organization_id: profile.session_organization_id
    });
    
    const convertedUser = {
      id: profile.id,
      name: profile.name || authUser.email?.split('@')[0] || 'User',
      email: profile.email || authUser.email || '',
      role: profile.role as UserRole || 'manager',
      assignedProperties: profile.assigned_properties || [],
      organization_id: profile.organization_id || undefined,
      createdAt: profile.created_at || new Date().toISOString()
    };
    
    console.log('Returning converted user:', convertedUser);
    return convertedUser;
    
  } catch (conversionError) {
    console.error('Exception in convertToAppUser:', conversionError);
    
    // Create fallback user even on error to prevent indefinite loading
    console.log('Creating fallback user due to error:', conversionError.message);
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      role: (authUser.user_metadata?.role as UserRole) || 'manager',
      assignedProperties: authUser.user_metadata?.assignedProperties || [],
      organization_id: authUser.user_metadata?.organization_id || undefined,
      createdAt: authUser.created_at || new Date().toISOString()
    };
  }
};
