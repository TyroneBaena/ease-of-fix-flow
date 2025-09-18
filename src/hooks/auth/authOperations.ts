import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { UserRole } from '@/types/user';

/**
 * Sign in with email and password
 */
export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log('🔐 Attempting sign in for:', email);
    
    // Basic validation
    if (!email || !password) {
      const errorMsg = 'Email and password are required';
      toast.error(errorMsg);
      return { user: null, error: { message: errorMsg } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.error('🔐 Sign in error:', error);
      
      // Provide user-friendly error messages
      let friendlyError = error.message;
      if (error.message?.includes('Invalid login credentials')) {
        friendlyError = 'Invalid email or password. Please check your credentials.';
      } else if (error.message?.includes('Email not confirmed')) {
        friendlyError = 'Please check your email and click the confirmation link.';
      } else if (error.message?.includes('Too many requests')) {
        friendlyError = 'Too many login attempts. Please wait a moment and try again.';
      } else if (error.message?.includes('Network error')) {
        friendlyError = 'Network error. Please check your connection.';
      }
      
      toast.error(friendlyError);
      return { user: null, error: { ...error, message: friendlyError } };
    }

    if (data.user) {
      console.log('🔐 Sign in successful:', data.user.email);
      toast.success('Signed in successfully!');
      return { user: data.user, error: null };
    }

    const unknownError = { message: 'Unknown sign in error occurred' };
    toast.error(unknownError.message);
    return { user: null, error: unknownError };
  } catch (error: any) {
    console.error('🔐 Sign in exception:', error);
    const networkError = 'Network error. Please check your connection and try again.';
    toast.error(networkError);
    return { user: null, error: { message: networkError } };
  }
};

/**
 * Sign out current user with comprehensive cleanup
 */
export const signOutUser = async () => {
  try {
    console.log('🔐 Starting sign out process...');
    
    // Check if user is actually signed in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('🔐 No active session found');
      toast.info('Already signed out');
      return { error: null };
    }

    console.log('🔐 Active session found, proceeding with sign out...');
    
    // Attempt global sign out (signs out from all sessions)
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('🔐 Sign out error:', error);
      // Don't show error toast for certain expected errors
      if (!error.message.includes('session_not_found') && !error.message.includes('invalid_token')) {
        toast.error(`Sign out error: ${error.message}`);
      }
    } else {
      console.log('🔐 Sign out successful');
      toast.success('Signed out successfully');
    }

    // Force page refresh to clear any remaining state
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);

    return { error };
  } catch (error: any) {
    console.error('🔐 Sign out exception:', error);
    toast.error('An error occurred during sign out');
    
    // Force redirect anyway for recovery
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
    
    return { error };
  }
};

/**
 * Update user role in both profiles and auth metadata
 */
export const updateUserRole = async (userId: string, role: UserRole) => {
  try {
    console.log(`🔐 Updating user role: ${userId} -> ${role}`);
    
    // Update role in profiles table first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('🔐 Profile update error:', profileError);
      throw profileError;
    }

    console.log('🔐 Profile updated successfully');

    // Also update in auth.users metadata for consistency
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { 
          user_metadata: { 
            role: role 
          } 
        }
      );

      if (authError) {
        console.warn('🔐 Auth metadata update warning (non-critical):', authError);
        // Don't throw here as profile update was successful
      } else {
        console.log('🔐 Auth metadata updated successfully');
      }
    } catch (authUpdateError) {
      console.warn('🔐 Auth metadata update failed (non-critical):', authUpdateError);
      // Continue as profile update was successful
    }

    // Fetch updated profile to return
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('🔐 Updated profile fetch error:', fetchError);
      // Return the profile we just updated
      return { profile, error: null };
    }

    console.log('🔐 User role update completed successfully');
    toast.success(`User role updated to ${role}`);
    
    return { profile: updatedProfile, error: null };
  } catch (error: any) {
    console.error('🔐 User role update error:', error);
    toast.error(`Failed to update user role: ${error.message}`);
    return { profile: null, error };
  }
};