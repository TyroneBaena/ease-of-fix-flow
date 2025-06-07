
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/user';
import { toast } from '@/lib/toast';
import { convertToAppUser } from './userConverter';

/**
 * Sign in with email/password
 */
export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log(`Signing in with email: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error("Error signing in:", error);
      toast.error("Failed to sign in: " + error.message);
      throw error;
    }
    
    console.log("Sign in successful:", data.user?.id);
    
    // For better debugging, log the user's role
    console.log("User role:", data.user?.user_metadata?.role);
    
    // Show toast notification
    toast.success("Signed in successfully");
    
    return data;
  } catch (error: any) {
    console.error("Error signing in:", error);
    toast.error("Failed to sign in: " + (error.message || "Unknown error"));
    throw error;
  }
};

/**
 * Sign out the current user with improved error handling
 */
export const signOutUser = async () => {
  try {
    console.log("Attempting to sign out user");
    
    // Get current session to check if user is actually signed in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("No active session found, considering logout successful");
      toast.success("Signed out successfully");
      return;
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Error during sign out:", error);
      // Don't throw error - we want logout to always succeed from UI perspective
      toast.success("Signed out successfully");
    } else {
      console.log("Sign out successful");
      toast.success("Signed out successfully");
    }
    
    // Clear any cached user data in localStorage
    try {
      localStorage.removeItem('supabase.auth.token');
    } catch (localStorageError) {
      console.warn("Could not clear localStorage:", localStorageError);
    }
    
    // Force a small delay to ensure state is cleared properly
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error: any) {
    console.error("Error signing out:", error);
    // Don't show error toast for logout - just log it
    console.log("Logout completed despite error");
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
