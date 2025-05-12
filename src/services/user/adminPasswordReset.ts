
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminPasswordResetResult {
  success: boolean;
  message: string;
  userId?: string;
}

/**
 * Admin function to manually reset a user's password by generating a random temporary password
 * @param userId - The ID of the user whose password should be reset
 * @param userEmail - The email of the user whose password should be reset
 * @returns Promise with reset result
 */
export async function adminResetUserPassword(
  userId: string,
  userEmail: string
): Promise<AdminPasswordResetResult> {
  try {
    console.log(`Admin initiating password reset for user: ${userId} (${userEmail})`);
    
    // Generate a random temporary password (12 characters)
    const tempPassword = Math.random().toString(36).slice(2, 8) + 
                        Math.random().toString(36).slice(2, 8);
    
    // Update the user's password using admin privileges
    const { error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );
    
    if (error) {
      console.error("Error in admin password reset:", error);
      return {
        success: false,
        message: `Failed to reset password: ${error.message}`,
        userId
      };
    }
    
    // Success - return the temporary password
    return {
      success: true,
      message: `Password has been reset to: ${tempPassword}`,
      userId
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
