
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/user';

export async function updateUserProfile(user: User): Promise<void> {
  console.log('updateUserProfile called with user:', {
    id: user.id,
    name: user.name,
    role: user.role,
    assignedProperties: user.assignedProperties,
    assignedPropertiesLength: user.assignedProperties?.length || 0
  });
  
  const assignedPropertiesArray = user.role === 'manager' ? user.assignedProperties : [];
  console.log('Final assigned_properties to save:', assignedPropertiesArray);
  
  const { error } = await supabase
    .from('profiles')
    .update({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      assigned_properties: assignedPropertiesArray,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);
    
  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

export async function sendPasswordReset(email: string): Promise<{success: boolean; message: string}> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    
    if (error) {
      console.error("Error requesting password reset:", error);
      return {
        success: false,
        message: error.message || "Password reset failed"
      };
    }
    
    return {
      success: true,
      message: `Password reset email sent to ${email}`
    };
  } catch (error: any) {
    console.error("Error in resetPassword:", error);
    return {
      success: false,
      message: error.message || "Unknown error occurred"
    };
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-user', {
    body: { userId }
  });
  
  if (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}
