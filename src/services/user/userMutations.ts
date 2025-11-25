
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
  
  // Prepare the update object
  const updateData = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    assigned_properties: assignedPropertiesArray,
    updated_at: new Date().toISOString()
  };
  
  console.log('🔧 Full update object being sent to Supabase:', updateData);
  console.log('🔧 Type of assigned_properties:', typeof updateData.assigned_properties);
  console.log('🔧 Is array:', Array.isArray(updateData.assigned_properties));
  
  const { data: updateResult, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select('assigned_properties');
    
  console.log('🔧 Supabase UPDATE response:', { updateResult, error });
    
  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
  
  // Verify the update was successful by reading back
  const { data: updatedProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('assigned_properties')
    .eq('id', user.id)
    .single();
  
  console.log('✅ Update complete. Verifying saved data:');
  console.log('   - User ID:', user.id);
  console.log('   - Sent to database:', assignedPropertiesArray);
  console.log('   - Actually saved in database:', updatedProfile?.assigned_properties);
  console.log('   - Match:', JSON.stringify(assignedPropertiesArray) === JSON.stringify(updatedProfile?.assigned_properties));
  
  if (fetchError) {
    console.error('Error fetching updated profile:', fetchError);
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
