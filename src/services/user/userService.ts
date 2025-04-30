import { User, UserRole } from '@/types/user';
import { InviteUserResult, UserService } from './types';
import { fetchAllUsers, checkExistingUser, checkUserAdminStatus } from './userQueries';
import { updateUserProfile, sendPasswordReset, deleteUserAccount } from './userMutations';
import { supabase } from '@/integrations/supabase/client';

export const userService: UserService = {
  getAllUsers: async () => {
    try {
      console.log("Fetching all users from profiles");
      return await fetchAllUsers();
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      throw error;
    }
  },
  
  checkUserExists: async (email: string) => {
    try {
      console.log(`Checking if user exists with email: ${email}`);
      return await checkExistingUser(email);
    } catch (error) {
      console.error("Error in checkUserExists:", error);
      return false;
    }
  },
  
  inviteUser: async (email: string, name: string, role: UserRole, assignedProperties: string[] = []) => {
    try {
      console.log(`Inviting new user: ${email}, role: ${role}`);
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // First check if the user exists before sending the invite
      const userExists = await userService.checkUserExists(normalizedEmail);
      
      if (userExists) {
        console.log(`User with email ${normalizedEmail} already exists, returning error`);
        return {
          success: false, 
          message: `A user with email ${normalizedEmail} already exists. Please use a different email address.`,
          email: normalizedEmail
        };
      }
      
      console.log(`User doesn't exist, proceeding with invitation`);
      
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: normalizedEmail,
          name,
          role,
          assignedProperties: role === 'manager' ? assignedProperties : [],
          bypassExistingCheck: false
        }
      });
      
      if (error) {
        console.error("Error inviting user:", error);
        // Only consider it a "user already exists" error if explicitly indicated
        if (error.message?.includes('already exists')) {
          return {
            success: false, 
            message: `A user with email ${normalizedEmail} already exists. Please use a different email address.`,
            email: normalizedEmail
          };
        }
        throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
      }
      
      // If data comes back with success: false, it's an error from the edge function
      if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        return data as InviteUserResult;
      }
      
      // Otherwise consider it a success
      return data as InviteUserResult;
    } catch (error: any) {
      console.error("Error in inviteUser:", error);
      if (typeof error === 'object' && error.message?.includes('already exists')) {
        return {
          success: false,
          message: `A user with email ${email.toLowerCase().trim()} already exists. Please use a different email address.`,
          email: email.toLowerCase().trim()
        };
      }
      throw error;
    }
  },
  
  updateUser: async (user: User) => {
    try {
      console.log(`Updating user profile: ${user.id}`);
      await updateUserProfile(user);
      console.log(`User profile ${user.id} updated successfully`);
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
    }
  },
  
  resetPassword: async (userId: string, email: string) => {
    try {
      console.log(`Requesting password reset for: ${email}`);
      return await sendPasswordReset(email);
    } catch (error: any) {
      console.error("Error in resetPassword:", error);
      return {
        success: false,
        message: error.message || "Unknown error occurred"
      };
    }
  },
  
  deleteUser: async (userId: string) => {
    try {
      console.log(`Deleting user: ${userId}`);
      await deleteUserAccount(userId);
      console.log(`User ${userId} deleted successfully`);
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw error;
    }
  },
  
  isUserAdmin: async (userId: string) => {
    try {
      console.log(`Checking if user ${userId} is admin`);
      return await checkUserAdminStatus(userId);
    } catch (error) {
      console.error("Error in isUserAdmin:", error);
      return false;
    }
  }
};

export default userService;
