
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { InviteRequest } from "./types.ts";

export async function findExistingUser(supabaseClient: any, email: string) {
  console.log(`Searching for existing user with email: ${email}`);
  
  const { data: existingUsers, error: searchError } = await supabaseClient.auth.admin.listUsers({
    filter: {
      email: email
    }
  });
  
  if (searchError) {
    console.error("Error searching for existing user:", searchError);
    throw searchError;
  }
  
  return existingUsers?.users?.length > 0 ? existingUsers.users[0] : null;
}

export async function updateExistingUser(supabaseClient: any, userId: string, name: string, role: string, assignedProperties: string[] = []) {
  console.log(`Updating existing user: ${userId}`);
  
  // Update in auth.users metadata
  const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        name,
        role,
        assignedProperties: role === 'manager' ? assignedProperties : [],
      }
    }
  );
  
  if (updateError) {
    console.error("Error updating existing user:", updateError);
    throw updateError;
  }
}

export async function createNewUser(supabaseClient: any, email: string, name: string, role: string, temporaryPassword: string, assignedProperties: string[] = []) {
  console.log(`Creating new user with email: ${email}`);
  
  // Create user in auth.users first
  const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      name,
      role,
      assignedProperties: role === 'manager' ? assignedProperties : [],
    }
  });
  
  if (createError) {
    console.error("Error creating user:", createError);
    throw createError;
  }

  // The profiles table trigger should handle creating the profile automatically
  // But let's verify it exists after a short delay to allow the trigger to run
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    console.log("Profile not created by trigger, creating manually");
    // If trigger didn't work, create profile manually
    const { error: insertError } = await supabaseClient
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: email,
        name: name,
        role: role,
        assigned_properties: role === 'manager' ? assignedProperties : []
      }]);

    if (insertError) {
      console.error("Error creating profile:", insertError);
      // Don't throw here, the auth user is already created
      // Just log the error and continue
      console.log("Profile creation failed but auth user exists");
    }
    
    // Double-check the profile creation
    const { data: checkProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    console.log("Profile check result:", checkProfile ? "Profile exists" : "Profile still missing");
  } else {
    console.log("Profile created by trigger successfully:", profile);
  }
  
  return authData.user;
}

export function generateTemporaryPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
