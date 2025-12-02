import { supabase } from '@/integrations/supabase/client';

export interface AdminPasswordResetResult {
  success: boolean;
  message: string;
  userId?: string;
  tempPassword?: string;
}

/**
 * Admin function to manually reset a user's password by generating a random temporary password
 * This calls an edge function that uses service role key for the operation
 * @param userId - The ID of the user whose password should be reset
 * @param userEmail - The email of the user whose password should be reset
 * @returns Promise with reset result including temporary password
 */
export async function adminResetUserPassword(
  userId: string,
  userEmail: string
): Promise<AdminPasswordResetResult> {
  try {
    console.log(`Admin initiating password reset for user: ${userId} (${userEmail})`);
    
    // Call the edge function which has access to service role key
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId, userEmail }
    });

    if (error) {
      console.error("Error calling admin-reset-password function:", error);
      return {
        success: false,
        message: `Failed to reset password: ${error.message}`,
        userId
      };
    }

    if (!data?.success) {
      console.error("Admin password reset failed:", data?.message);
      return {
        success: false,
        message: data?.message || "Failed to reset password",
        userId
      };
    }

    // Success - return the temporary password
    return {
      success: true,
      message: data.message,
      userId,
      tempPassword: data.tempPassword
    };
  } catch (error: any) {
    console.error("Exception in adminResetUserPassword:", error);
    return {
      success: false,
      message: error.message || "Unknown error occurred",
      userId
    };
  }
}
