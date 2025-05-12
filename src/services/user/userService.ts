
import { User, UserRole } from '@/types/user';
import { InviteUserResult, UserService } from './types';
import { fetchAllUsers, checkExistingUser, checkUserAdminStatus } from './userQueries';
import { updateUserProfile, sendPasswordReset, deleteUserAccount } from './userMutations';
import { adminResetUserPassword, AdminPasswordResetResult } from './adminPasswordReset';
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
  
  inviteUser: async (email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<InviteUserResult> => {
    try {
      console.log(`Inviting new user: ${email}, role: ${role}`);
      
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log(`Proceeding with invitation for: ${normalizedEmail}`);
      
      // Call the edge function directly without pre-checking
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
        throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
      }
      
      // Properly handle the response from the edge function
      console.log("Edge function response:", data);
      
      // Return the edge function response directly
      return data as InviteUserResult;
    } catch (error: any) {
      console.error("Error in inviteUser:", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred while inviting the user",
        email: email.toLowerCase().trim()
      };
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
  
  adminResetPassword: async (userId: string, email: string): Promise<AdminPasswordResetResult> => {
    try {
      console.log(`Admin requesting password reset for: ${email} (${userId})`);
      return await adminResetUserPassword(userId, email);
    } catch (error: any) {
      console.error("Error in adminResetPassword:", error);
      return {
        success: false,
        message: error.message || "Unknown error occurred",
        userId
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
