
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

export const userService = {
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (error) throw error;
    
    return data?.map(profile => ({
      id: String(profile.id),
      name: profile.Name || '',
      email: String(profile.email) || '',
      role: String(profile.role) as UserRole,
      assignedProperties: profile.assigned_properties ? String(profile.assigned_properties).split(',') : [],
      createdAt: String(profile.created_at)
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
      // Convert UUID string to number for database insert
      const numericId = parseInt(authData.user.id, 10) || 0; // Fallback to 0 if parsing fails
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: numericId,
          Name: name,
          email: email,
          role: role,
          assigned_properties: assignedProperties.join(','),
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
    // Convert string ID to number for database update
    const numericId = parseInt(user.id, 10) || 0; // Fallback to 0 if parsing fails
    
    const { error } = await supabase
      .from('user_profiles')
      .update({
        Name: user.name,
        email: user.email,
        role: user.role,
        assigned_properties: user.role === 'manager' ? user.assignedProperties.join(',') : null
      })
      .eq('id', numericId);
    
    if (error) throw error;
  },
  
  // Delete user (admin only)
  async deleteUser(userId: string): Promise<void> {
    // Convert string ID to number for database deletion
    const numericId = parseInt(userId, 10) || 0; // Fallback to 0 if parsing fails
    
    // Delete the user profile directly (no need for edge function)
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', numericId);
    
    if (error) throw error;
  },
  
  // Check if user is admin
  async isUserAdmin(userId: string): Promise<boolean> {
    // Convert string ID to number for database query
    const numericId = parseInt(userId, 10) || 0; // Fallback to 0 if parsing fails
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', numericId)
      .single();
    
    if (error) return false;
    return data?.role === 'admin';
  }
};
