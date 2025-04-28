
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';
import { toast } from 'sonner';

// Define the return type for the inviteUser function
interface InviteUserResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean;  // New field to indicate if email was sent in test mode
  testModeInfo?: string; // Additional info about test mode limitations
}

export const userService = {
  // Get all users (admin only) - filter out contractor roles
  async getAllUsers(): Promise<User[]> {
    try {
      console.log("Fetching all users from profiles");
      
      // First, try to get data from the profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'manager']);  // Only get admin and manager roles, exclude contractors
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }
      
      console.log(`Found ${profiles?.length || 0} user profiles`);
      
      // Map the profiles to our User type
      return (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        role: profile.role as UserRole || 'manager',
        assignedProperties: profile.assigned_properties || [],
        createdAt: profile.created_at || ''
      }));
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      throw error;
    }
  },
  
  // Invite new user (admin only)
  async inviteUser(email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<InviteUserResult> {
    try {
      console.log(`Inviting new user: ${email}, role: ${role}`);
      
      // Call the send-invite edge function
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          email,
          name,
          role,
          assignedProperties: role === 'manager' ? assignedProperties : []
        }
      });
      
      console.log("Invite function response:", data);
      
      if (error) {
        console.error("Error inviting user:", error);
        throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
      }
      
      if (!data || typeof data !== 'object') {
        console.error("Invalid response from send-invite function:", data);
        throw new Error("Invalid response from invitation service");
      }
      
      // Check if the invitation was successful based on the response
      if (!data.success) {
        console.log(`Invitation for ${email} failed with message: ${data.message}`);
      } else {
        console.log(`Invitation processed for ${email} successfully`);
      }
      
      return data as InviteUserResult;
    } catch (error) {
      console.error("Error in inviteUser:", error);
      throw error;
    }
  },
  
  // Update user (admin only)
  async updateUser(user: User): Promise<void> {
    try {
      console.log(`Updating user profile: ${user.id}`);
      
      // Update the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          name: user.name,
          email: user.email,
          role: user.role,
          assigned_properties: user.role === 'manager' ? user.assignedProperties : [],
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        console.error("Error updating user profile:", error);
        throw error;
      }
      
      console.log(`User profile ${user.id} updated successfully`);
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
    }
  },
  
  // Reset user password
  async resetPassword(email: string): Promise<{success: boolean; message: string}> {
    try {
      console.log(`Requesting password reset for: ${email}`);
      
      // Use Supabase's built-in password reset functionality
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (error) {
        console.error("Error requesting password reset:", error);
        return {
          success: false,
          message: error.message || "Password reset failed"
        };
      }
      
      console.log(`Password reset email sent to ${email}`);
      return {
        success: true,
        message: `Password reset email sent to ${email}`
      };
    } catch (error) {
      console.error("Error in resetPassword:", error);
      return {
        success: false,
        message: error.message || "Unknown error occurred"
      };
    }
  },
  
  // Delete user (admin only)
  async deleteUser(userId: string): Promise<void> {
    try {
      console.log(`Deleting user: ${userId}`);
      // Use the edge function to delete the user
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      
      if (error) {
        console.error("Error deleting user:", error);
        throw error;
      }
      
      console.log(`User ${userId} deleted successfully`);
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw error;
    }
  },
  
  // Check if user is admin
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      console.log(`Checking if user ${userId} is admin`);
      
      // Get the user's role from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error checking user admin status:", error);
        return false;
      }
      
      const isAdmin = data.role === 'admin';
      console.log(`User ${userId} admin status: ${isAdmin}`);
      return isAdmin;
    } catch (error) {
      console.error("Error in isUserAdmin:", error);
      return false;
    }
  }
};
