
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
      
      // Let the auth state listener handle the session and organization setup
      // Don't force page refresh here - let React Router handle navigation
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
    console.log(`🔄 Updating user role to: ${role} for user: ${userId}`);
    
    // First update the profiles table directly
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    
    if (profileError) {
      console.error("❌ Error updating profile table:", profileError);
      toast.error("Failed to update role: " + profileError.message);
      throw profileError;
    }
    
    console.log("✅ Profile table updated successfully to:", role);
    
    // Also update user metadata for consistency
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role }
      });
      
      if (metadataError) {
        console.warn("⚠️ Could not update user metadata:", metadataError.message);
        // Don't throw - profile update was successful
      } else {
        console.log("✅ User metadata updated successfully");
      }
    } catch (metadataErr) {
      console.warn("⚠️ Metadata update failed (continuing with profile-only update):", metadataErr);
    }
    
    toast.success(`Role updated to ${role}`);
    
    // Get the updated user profile
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error("❌ Error fetching updated profile:", fetchError);
      throw fetchError;
    }
    
    return updatedProfile;
  } catch (error) {
    console.error("❌ Error updating role:", error);
    toast.error("Failed to update role: " + (error.message || 'Unknown error'));
    throw error;
  }
};
