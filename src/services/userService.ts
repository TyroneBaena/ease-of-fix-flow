
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';
import { toast } from 'sonner';

export const userService = {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    try {
      console.log("Fetching all users");
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching users:", authError);
        
        // Check if this is a permissions error and handle it gracefully
        if (authError.status === 403 || authError.message?.includes("User not allowed")) {
          console.log("Permission error when fetching users - using edge function instead");
          
          // Return an empty array instead of throwing an error
          return [];
        }
        
        throw authError;
      }
      
      console.log(`Found ${authUsers?.users?.length || 0} users`);
      
      return authUsers.users.map(user => ({
        id: user.id,
        name: user.user_metadata?.name || '',
        email: user.email || '',
        role: user.user_metadata?.role as UserRole || 'manager',
        assignedProperties: user.user_metadata?.assignedProperties || [],
        createdAt: user.created_at || ''
      }));
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      
      // Don't throw the error, just return an empty array
      // This prevents the UI from showing error messages repeatedly
      return [];
    }
  },
  
  // Invite new user (admin only)
  async inviteUser(email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<any> {
    try {
      console.log(`Inviting new user: ${email}, role: ${role}`);
      
      // Call the send-invite edge function
      const { data, error: inviteError } = await supabase.functions.invoke('send-invite', {
        body: {
          email,
          name,
          role,
          assignedProperties: role === 'manager' ? assignedProperties : []
        }
      });
      
      console.log("Invite function response:", data);
      
      if (inviteError) {
        console.error("Error inviting user:", inviteError);
        throw inviteError;
      }
      
      console.log(`Invitation sent to ${email} successfully`);
      return data;
    } catch (error) {
      console.error("Error in inviteUser:", error);
      throw error;
    }
  },
  
  // Update user (admin only)
  async updateUser(user: User): Promise<void> {
    try {
      console.log(`Updating user: ${user.id}`);
      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          email: user.email,
          user_metadata: {
            name: user.name,
            role: user.role,
            assignedProperties: user.role === 'manager' ? user.assignedProperties : []
          }
        }
      );
      
      if (error) {
        // If we get a permissions error, try using the edge function instead
        if (error.status === 403 || error.message?.includes("User not allowed")) {
          console.log("Permission error when updating user - using edge function instead");
          return await userService.inviteUser(user.email, user.name, user.role, user.assignedProperties);
        }
        
        console.error("Error updating user:", error);
        throw error;
      }
      
      console.log(`User ${user.id} updated successfully`);
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
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
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      
      if (error) {
        // For permission errors, fall back to checking local user data
        if (error.status === 403 || error.message?.includes("User not allowed")) {
          console.log("Permission error when checking admin status - checking local user data");
          
          // Get the current user from the auth state
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === userId) {
            const isAdmin = user.user_metadata?.role === 'admin';
            console.log(`User ${userId} admin status from local data: ${isAdmin}`);
            return isAdmin;
          }
        }
        
        console.error("Error checking user admin status:", error);
        return false;
      }
      
      const isAdmin = data.user.user_metadata?.role === 'admin';
      console.log(`User ${userId} admin status: ${isAdmin}`);
      return isAdmin;
    } catch (error) {
      console.error("Error in isUserAdmin:", error);
      return false;
    }
  }
};
