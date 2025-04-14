
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

export const userService = {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) throw authError;
    
    return authUsers.users.map(user => ({
      id: user.id,
      name: user.user_metadata?.name || '',
      email: user.email || '',
      role: user.user_metadata?.role as UserRole || 'manager',
      assignedProperties: user.user_metadata?.assignedProperties || [],
      createdAt: user.created_at || ''
    }));
  },
  
  // Invite new user (admin only)
  async inviteUser(email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<void> {
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
    
    if (authError) throw authError;
    
    // Log for reference (in a real app, would send an email)
    console.log(`Invited user: ${email} with temp password: ${temporaryPassword}`);
  },
  
  // Update user (admin only)
  async updateUser(user: User): Promise<void> {
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
    
    if (error) throw error;
  },
  
  // Delete user (admin only)
  async deleteUser(userId: string): Promise<void> {
    // Use the edge function to delete the user
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { userId }
    });
    
    if (error) throw error;
  },
  
  // Check if user is admin
  async isUserAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) return false;
    return data.user.user_metadata?.role === 'admin';
  }
};
