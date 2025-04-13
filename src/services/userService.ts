
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types/user';

export const userService = {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (error) throw error;
    
    return data?.map(profile => ({
      id: profile.id,
      name: profile.name || '',
      email: profile.email || '',
      role: profile.role as UserRole,
      assignedProperties: profile.assigned_properties || [],
      createdAt: profile.created_at
    })) || [];
  },
  
  // Invite new user (admin only)
  async inviteUser(email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<void> {
    // Generate a random password for the initial account
    const temporaryPassword = Math.random().toString(36).slice(-8);
    
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: temporaryPassword,
      options: {
        data: {
          name,
          role
        }
      }
    });
    
    if (authError) throw authError;
    
    // 2. Create user profile
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email,
          name,
          role,
          assigned_properties: role === 'manager' ? assignedProperties : null,
          created_at: new Date().toISOString()
        });
      
      if (profileError) throw profileError;
      
      // 3. Send invitation email with password reset link (in a real app)
      // This would typically use a server-side function to send emails
      console.log(`Invited user: ${email} with temp password: ${temporaryPassword}`);
    }
  },
  
  // Update user (admin only)
  async updateUser(user: User): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        name: user.name,
        email: user.email,
        role: user.role,
        assigned_properties: user.role === 'manager' ? user.assignedProperties : null
      })
      .eq('id', user.id);
    
    if (error) throw error;
  },
  
  // Delete user (admin only)
  async deleteUser(userId: string): Promise<void> {
    // Delete the auth user (this cascades to the profile through RLS)
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  },
  
  // Check if user is admin
  async isUserAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) return false;
    return data?.role === 'admin';
  }
};
