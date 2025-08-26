
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/user';
import { toast } from '@/lib/toast';
import { convertToAppUser } from './userConverter';
import { cleanupAuthState, forcePageRefresh } from '@/utils/authCleanup';

/**
 * Sign in with email/password
 */
export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log('🔑 Starting sign in process for:', email);
    
    // Clean up any existing auth state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any stale sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.log('🔑 Global signout attempt (ignoring errors):', err);
      // Continue even if this fails
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error('🔑 Sign in error:', error);
      toast.error("Failed to sign in: " + error.message);
      throw error;
    }
    
    if (data.user) {
      console.log('🔑 Sign in successful for user:', data.user.id);
      console.log('🔑 User role from metadata:', data.user.user_metadata?.role);
      
      toast.success("Successfully signed in!");
      
      // Force page refresh to ensure clean state
      setTimeout(() => {
        forcePageRefresh('/dashboard');
      }, 100);
      
      return data;
    }
    
    throw new Error('No user data returned from sign in');
  } catch (error: any) {
    console.error('🔑 Error in signInWithEmailPassword:', error);
    toast.error("Failed to sign in: " + (error.message || "Unknown error"));
    throw error;
  }
};

/**
 * Sign out the current user with improved error handling and proper cleanup
 */
export const signOutUser = async () => {
  try {
    console.log('🚪 Starting sign out process');
    
    // Check if there's an active session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('🚪 No active session found');
      cleanupAuthState();
      forcePageRefresh('/');
      return;
    }

    console.log('🚪 Active session found, proceeding with sign out');
    
    // Attempt global sign out
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('🚪 Sign out error:', error);
      toast.error('Sign out encountered an issue, but you have been logged out locally');
    } else {
      console.log('🚪 Sign out successful');
      toast.success('Successfully signed out');
    }
    
  } catch (error: any) {
    console.error('🚪 Error during sign out:', error);
    toast.error('Sign out completed with warnings');
  } finally {
    // Always clean up auth state and refresh
    cleanupAuthState();
    
    // Force page refresh to ensure completely clean state
    setTimeout(() => {
      forcePageRefresh('/');
    }, 100);
  }
};

/**
 * Update the role of the current user
 */
export const updateUserRole = async (userId: string, role: UserRole) => {
  try {
    console.log(`Updating user role to: ${role}`);
    
    // Update the user's profile in the profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    
    if (error) {
      console.error("Error updating role in profile:", error);
      
      // Fall back to updating user metadata
      const { data, error: metadataError } = await supabase.auth.updateUser({
        data: { role }
      });
      
      if (metadataError) {
        console.error("Error updating user role:", metadataError);
        toast.error("Failed to update role: " + metadataError.message);
        throw metadataError;
      }
      
      console.log("User role updated successfully via metadata to:", role);
      toast.success(`Role updated to ${role}`);
      
      // Return the updated user
      if (data.user) {
        return await convertToAppUser(data.user);
      }
    } else {
      console.log("User role updated successfully in profiles to:", role);
      toast.success(`Role updated to ${role}`);
    }
  } catch (error) {
    console.error("Error updating role:", error);
    toast.error("Failed to update role: " + error.message);
    throw error;
  }
};
