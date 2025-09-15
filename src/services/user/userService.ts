import { User, UserRole } from '@/types/user';
import { InviteUserResult, UserService } from './types';
import { fetchAllUsers, checkExistingUser, checkUserAdminStatus } from './userQueries';
import { updateUserProfile, sendPasswordReset, deleteUserAccount } from './userMutations';
import { adminResetUserPassword, AdminPasswordResetResult } from './adminPasswordReset';
import { supabase } from '@/integrations/supabase/client';
import { tenantService } from './tenantService';

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
      
      // Ensure we have a valid session before making the request
      console.log("Checking session before invitation...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('No valid session found for user invitation:', sessionError);
        return {
          success: false,
          message: "Authentication required. Please log in and try again.",
          email: normalizedEmail
        };
      }
      
      console.log(`Proceeding with invitation for: ${normalizedEmail} with valid session`);
      console.log("About to call supabase.functions.invoke('send-invite')...");
      
      const requestBody = {
        email: normalizedEmail,
        name,
        role,
        assignedProperties: role === 'manager' ? assignedProperties : [],
        bypassExistingCheck: false
      };
      
      console.log("Request body to be sent:", JSON.stringify(requestBody, null, 2));
      console.log("Session access token available:", !!session.access_token);
      console.log("User ID from session:", session.user?.id);
      
      try {
        console.log("Making edge function call NOW...");
        // Call the edge function (Supabase automatically adds auth headers)
        const { data, error } = await supabase.functions.invoke('send-invite', {
          body: requestBody
        });
        
        console.log("Supabase function call completed. Response:", { data, error });
        console.log("Edge function data received:", data);
        console.log("Edge function error received:", error);
        
        // Handle edge function errors (network, timeout, etc.)
        if (error) {
          console.error('Edge function error:', error);
          const errorMessage = error.message || "Failed to send invitation due to network error";
          return {
            success: false,
            message: errorMessage,
            email: normalizedEmail
          };
        }

        // Handle business logic failures from the edge function
        if (!data?.success) {
          console.error('Edge function returned failure:', data);
          const errorMessage = data?.message || "Failed to send invitation";
          return {
            success: false,
            message: errorMessage,
            email: normalizedEmail
          };
        }
        
        // Check if tenant schema was created properly
        if (data.success && data.userId) {
          const schemaExists = await tenantService.verifyUserSchema(data.userId);
          if (!schemaExists) {
            console.warn(`Schema was not created automatically for user ${data.userId}, but invitation was successful`);
          } else {
            console.log(`Schema was successfully created for user ${data.userId}`);
          }
        }
        
        // Properly handle the response from the edge function
        console.log("Edge function response:", data);
        
        // Return the edge function response directly
        return data as InviteUserResult;
        
      } catch (functionCallError: any) {
        console.error("CRITICAL ERROR: Edge function invocation failed:", functionCallError);
        console.error("Error details:", {
          message: functionCallError.message,
          stack: functionCallError.stack,
          name: functionCallError.name
        });
        
        return {
          success: false,
          message: `Failed to invoke invitation function: ${functionCallError.message}`,
          email: normalizedEmail
        };
      }
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
  },
  
  // Implement the schema methods according to the interface
  getUserSchema: async () => {
    try {
      return await tenantService.getUserSchema();
    } catch (error) {
      console.error("Error getting user schema:", error);
      return null;
    }
  },
  
  useUserSchema: async () => {
    try {
      // Organization-based approach doesn't need explicit schema operations
      return true;
    } catch (error) {
      console.error("Error using user schema:", error);
      return false;
    }
  }
};

export default userService;
