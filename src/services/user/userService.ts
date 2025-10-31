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
      
      console.log("Session check result:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        sessionError: sessionError?.message,
        accessToken: session?.access_token ? "Present" : "Missing"
      });
      
      if (sessionError || !session) {
        console.error('No valid session found for user invitation:', sessionError);
        return {
          success: false,
          message: "Authentication required. Please log in and try again.",
          email: normalizedEmail
        };
      }
      
      console.log(`Proceeding with invitation for: ${normalizedEmail} with valid session`);
      console.log("Session details:", {
        userId: session.user?.id,
        email: session.user?.email,
        accessToken: session.access_token ? "Present" : "Missing",
        refreshToken: session.refresh_token ? "Present" : "Missing"
      });
      
      console.log("Supabase client status check:");
      console.log("Supabase object:", !!supabase);
      console.log("Supabase functions:", !!supabase.functions);
      console.log("Supabase functions invoke:", typeof supabase.functions.invoke);
      
      console.log("About to call supabase.functions.invoke('send-invite')...");
      
      const requestBody = {
        email: normalizedEmail,
        name,
        role,
        assignedProperties: role === 'manager' ? assignedProperties : [],
        bypassExistingCheck: false
      };
      
      console.log("Request body to be sent:", JSON.stringify(requestBody, null, 2));
      
      try {
        console.log("Making edge function call NOW...");
        
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
        
        console.log("Supabase function call completed. Response:", { data, error });
        console.log("Edge function data received:", data);
        console.log("Edge function error received:", error);
        
        // Handle edge function errors (network, timeout, etc.)
        if (error) {
          console.error('Edge function error:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          
          // Try to extract the actual error response from the FunctionsHttpError
          let errorMessage = "Unable to send invitation. Please try again.";
          let messageFound = false;
          
          try {
            // The error.context often contains the actual response body
            if (error.context) {
              let responseBody;
              if (typeof error.context === 'string') {
                responseBody = JSON.parse(error.context);
              } else if (typeof error.context === 'object') {
                responseBody = error.context;
              }
              
              // Extract the message from the response
              if (responseBody?.message) {
                const serverMessage = responseBody.message;
                
                // Check for specific error patterns and provide user-friendly messages
                if (serverMessage.includes('already been registered') || 
                    serverMessage.includes('already exists') ||
                    serverMessage.includes('A user with this email') ||
                    serverMessage.includes('email address has already been registered')) {
                  errorMessage = "This email address is already registered. Please use a different email.";
                  messageFound = true;
                } else if (serverMessage.includes('already a member of your organization')) {
                  errorMessage = serverMessage; // Use the server message directly
                  messageFound = true;
                } else if (serverMessage.length > 0) {
                  // Use the server message if it exists
                  errorMessage = serverMessage;
                  messageFound = true;
                }
              }
            }
          } catch (parseError) {
            console.error('Could not parse error context:', parseError);
          }
          
          // Also check the error message itself for patterns
          if (!messageFound) {
            const errorStr = error.message || '';
            
            if (errorStr.includes('already been registered') || 
                errorStr.includes('already exists') ||
                errorStr.includes('email address has already been registered')) {
              errorMessage = "This email address is already registered. Please use a different email.";
            } else if (errorStr.includes('timeout')) {
              errorMessage = "The request took too long. Please check your connection and try again.";
            } else if (errorStr.includes('network')) {
              errorMessage = "Network error. Please check your connection and try again.";
            } else if (errorStr.includes('non-2xx status code')) {
              // Generic message for HTTP errors  
              errorMessage = "The invitation could not be processed. Please try again.";
            }
          }
          
          return {
            success: false,
            message: errorMessage,
            email: normalizedEmail
          };
        }

        // Handle business logic failures from the edge function
        if (!data?.success) {
          console.error('Edge function returned failure:', data);
          
          // Parse and provide user-friendly error messages
          let userMessage = "Unable to send invitation. Please try again.";
          const originalMessage = data?.message || "";
          
          if (originalMessage.includes('already been registered') || originalMessage.includes('already exists')) {
            userMessage = `This email address is already registered. Please use a different email or contact the user to join your organization.`;
          } else if (originalMessage.includes('invalid email')) {
            userMessage = "Please enter a valid email address.";
          } else if (originalMessage.includes('permission')) {
            userMessage = "You don't have permission to invite users. Please contact your administrator.";
          } else if (originalMessage) {
            // Use the original message if it's not too technical
            userMessage = originalMessage;
          }
          
          return {
            success: false,
            message: userMessage,
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
