
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
  
  // Check current session before making the request
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Current session in updateUserProfile:', {
    hasSession: !!session,
    userId: session?.user?.id,
    accessToken: session?.access_token ? 'present' : 'missing'
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
    // Use production URL if on production, otherwise use current origin
    const isProduction = window.location.hostname === 'housinghub.app' || window.location.hostname === 'www.housinghub.app';
    const redirectUrl = isProduction 
      ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
      : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
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
