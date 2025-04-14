
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

export const userService = {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    try {
      console.log("Fetching all users");
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching users:", authError);
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
      throw error;
    }
  },
  
  // Invite new user (admin only)
  async inviteUser(email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<void> {
    try {
      console.log(`Inviting new user: ${email}, role: ${role}`);
      // Generate a random password for the initial account
      const temporaryPassword = Math.random().toString(36).slice(-8);
      
      // Create auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: temporaryPassword,
        options: {
          data: {
            name,
            role,
            assignedProperties: role === 'manager' ? assignedProperties : []
          }
        }
      });
      
      if (authError) {
        console.error("Error inviting user:", authError);
        throw authError;
      }
      
      // Log for reference (in a real app, would send an email)
      console.log(`Invited user: ${email} with ID: ${authData?.user?.id}, temp password: ${temporaryPassword}`);
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
