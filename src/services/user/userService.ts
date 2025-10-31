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
      console.log(`✉️ userService.inviteUser - Called with email: ${email}, role: ${role}`);
      console.log(`✉️ userService.inviteUser - assignedProperties:`, assignedProperties);
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Ensure we have a valid session before making the request
      console.log("✉️ userService.inviteUser - Checking session before invitation...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log("✉️ userService.inviteUser - Session check result:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        sessionError: sessionError?.message,
        accessToken: session?.access_token ? "Present" : "Missing"
      });
      
      if (sessionError || !session) {
        console.error('✉️ userService.inviteUser - No valid session found for user invitation:', sessionError);
        return {
          success: false,
          message: "Authentication required. Please log in and try again.",
          email: normalizedEmail
        };
      }
      
      console.log(`✉️ userService.inviteUser - Proceeding with invitation for: ${normalizedEmail} with valid session`);
      console.log("Session details:", {
        userId: session.user?.id,
        email: session.user?.email,
        accessToken: session.access_token ? "Present" : "Missing",
        refreshToken: session.refresh_token ? "Present" : "Missing"
      });
      
      console.log("✉️ userService.inviteUser - Supabase client status check:");
      console.log("✉️ userService.inviteUser - Supabase object:", !!supabase);
      console.log("✉️ userService.inviteUser - Supabase functions:", !!supabase.functions);
      console.log("✉️ userService.inviteUser - Supabase functions invoke:", typeof supabase.functions.invoke);
      
      console.log("✉️ userService.inviteUser - About to call supabase.functions.invoke('send-invite')...");
      
      const requestBody = {
        email: normalizedEmail,
        name,
        role,
        assignedProperties: role === 'manager' ? assignedProperties : [],
        bypassExistingCheck: false
      };
      
      console.log("✉️ userService.inviteUser - Request body to be sent:", JSON.stringify(requestBody, null, 2));
      
      try {
        console.log("✉️ userService.inviteUser - Making edge function call NOW...");
        
        // Add timeout to prevent infinite loading
        const EDGE_FUNCTION_TIMEOUT = 30000; // 30 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout - please try again')), EDGE_FUNCTION_TIMEOUT);
        });
        
        // Call the edge function with timeout (Supabase automatically adds auth headers)
        const invocationPromise = supabase.functions.invoke('send-invite', {
          body: requestBody
        });
        
        const { data, error } = await Promise.race([
          invocationPromise,
          timeoutPromise
        ]) as any;
        
        console.log("Edge function response - data:", data, "error:", error);
        
        // Handle FunctionsHttpError (non-2xx status from edge function)
        if (error) {
          console.log("Edge function error detected");
          
          let errorMessage = "Unable to send invitation. Please try again.";
          
          // Extract error message from edge function response
          try {
            // error.context is a Response object - need to call .json() on it
            if (error.context && typeof error.context.json === 'function') {
              console.log("Parsing error.context.json()");
              const responseBody = await error.context.json();
              console.log("Response body:", responseBody);
              
              if (responseBody?.message) {
                const serverMessage = responseBody.message;
                console.log("Server message:", serverMessage);
                
                if (serverMessage.includes('already been registered') || 
                    serverMessage.includes('already exists') ||
                    serverMessage.includes('A user with this email')) {
                  errorMessage = "This email address is already registered. Please use a different email.";
                } else if (serverMessage.includes('already a member of your organization')) {
                  errorMessage = serverMessage;
                } else if (serverMessage.includes('invalid email')) {
                  errorMessage = "Please enter a valid email address.";
                } else if (serverMessage.includes('permission')) {
                  errorMessage = "You don't have permission to invite users.";
                } else {
                  errorMessage = serverMessage;
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing edge function response:", parseError);
            
            // Check error message for timeout/network issues
            if (error.message?.includes('timeout')) {
              errorMessage = "Request timeout. Please try again.";
            } else if (error.message?.includes('network')) {
              errorMessage = "Network error. Please check your connection.";
            }
          }
          
          console.log("Final error message to display:", errorMessage);
          
          return {
            success: false,
            message: errorMessage,
            email: normalizedEmail
          };
        }
        
        // Check if data indicates failure
        if (data && !data.success) {
          console.log('Edge function returned failure in data:', data);
          
          let errorMessage = "Unable to send invitation. Please try again.";
          const serverMessage = data.message || "";
          
          if (serverMessage.includes('already been registered') || serverMessage.includes('already exists')) {
            errorMessage = "This email address is already registered. Please use a different email.";
          } else if (serverMessage.includes('invalid email')) {
            errorMessage = "Please enter a valid email address.";
          } else if (serverMessage) {
            errorMessage = serverMessage;
          }
          
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
        
        // Provide user-friendly error message
        let userMessage = "Unable to process invitation at this time. Please try again later.";
        
        if (functionCallError.message?.includes('timeout')) {
          userMessage = "The request took too long. Please try again.";
        } else if (functionCallError.message?.includes('network')) {
          userMessage = "Network error. Please check your connection and try again.";
        }
        
        return {
          success: false,
          message: userMessage,
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
