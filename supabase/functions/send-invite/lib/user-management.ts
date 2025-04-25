
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { InviteRequest } from "./types.ts";

export async function findExistingUser(supabaseClient: any, email: string) {
  if (!email) {
    console.error("Missing email in findExistingUser");
    throw new Error("Email is required to check for existing users");
  }
  
  console.log(`Searching for existing user with email: ${email}`);
  
  try {
    const { data: existingUsers, error: searchError } = await supabaseClient.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (searchError) {
      console.error("Error searching for existing user:", searchError);
      throw searchError;
    }
    
    const userExists = existingUsers?.users?.length > 0 ? existingUsers.users[0] : null;
    console.log(`User search result: ${userExists ? 'User exists' : 'User does not exist'}`);
    return userExists;
  } catch (error) {
    console.error("Error in findExistingUser:", error);
    throw new Error(`Failed to check for existing user: ${error.message}`);
  }
}

export async function updateExistingUser(supabaseClient: any, userId: string, name: string, role: string, assignedProperties: string[] = []) {
  if (!userId || !name || !role) {
    console.error("Missing required parameters in updateExistingUser");
    throw new Error("User ID, name, and role are required to update a user");
  }
  
  console.log(`Updating existing user: ${userId}`);
  
  try {
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
    
    console.log(`User ${userId} updated successfully`);
  } catch (error) {
    console.error("Error in updateExistingUser:", error);
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

export async function createNewUser(supabaseClient: any, email: string, name: string, role: string, temporaryPassword: string, assignedProperties: string[] = []) {
  if (!email || !name || !role || !temporaryPassword) {
    console.error("Missing required parameters in createNewUser");
    throw new Error("Email, name, role, and temporaryPassword are required to create a user");
  }
  
  console.log(`Creating new user with email: ${email}`);
  
  try {
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
    
    console.log("Auth user created successfully:", authData.user.id);

    // Create the profile manually regardless of trigger to ensure it exists
    try {
      console.log("Creating profile for new user");
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: email,
          name: name,
          role: role,
          assigned_properties: role === 'manager' ? assignedProperties : []
        }])
        .select()
        .single();

      if (profileError) {
        console.error("Error creating user profile:", profileError);
        console.log("Profile creation failed but auth user exists - continuing");
      } else {
        console.log("Profile created successfully:", profile?.id);
      }
    } catch (profileError) {
      console.error("Exception creating user profile:", profileError);
      console.log("Profile creation failed but auth user exists - continuing");
    }
    
    // Double-check the profile exists after a short delay
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: checkProfile, error: checkError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (checkError || !checkProfile) {
        console.log("Profile verification failed after creation, attempting second insert");
        
        // If profile still doesn't exist, try creating it again with upsert
        const { error: secondInsertError } = await supabaseClient
          .from('profiles')
          .upsert([{
            id: authData.user.id,
            email: email,
            name: name,
            role: role,
            assigned_properties: role === 'manager' ? assignedProperties : []
          }]);
          
        if (secondInsertError) {
          console.error("Second profile creation attempt failed:", secondInsertError);
        } else {
          console.log("Second profile creation attempt succeeded");
        }
      } else {
        console.log("Profile verification successful");
      }
    } catch (verificationError) {
      console.error("Error verifying profile:", verificationError);
    }
    
    return authData.user;
  } catch (error) {
    console.error("Error in createNewUser:", error);
    throw new Error(`Failed to create new user: ${error.message}`);
  }
}

export function generateTemporaryPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
