
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { InviteRequest } from "./types.ts";

export async function findExistingUser(supabaseClient: any, email: string) {
  if (!email) {
    console.error("Missing email in findExistingUser");
    throw new Error("Email is required to check for existing users");
  }
  
  // Normalize email to lowercase for consistent checks
  const normalizedEmail = email.toLowerCase().trim();
  
  console.log(`Searching for existing user with email: ${normalizedEmail}`);
  
  try {
    // Use admin API to check for existing users with this email
    const { data: existingUsers, error: searchError } = await supabaseClient.auth.admin.listUsers({
      filter: {
        email: normalizedEmail
      }
    });
    
    if (searchError) {
      console.error("Error searching for existing user:", searchError);
      throw searchError;
    }
    
    // Log detailed information about the search result for debugging
    console.log(`User search result:`, existingUsers?.users?.length > 0 
      ? `User exists with ID ${existingUsers.users[0].id}` 
      : 'User does not exist');

    // If user exists, check if they have a profile
    if (existingUsers?.users?.length > 0) {
      const userExists = existingUsers.users[0];
      
      // Check for profile explicitly
      const { data: profile, error: profileError, count } = await supabaseClient
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('id', userExists.id);

      // Log detailed profile check information
      if (profileError) {
        console.log(`Profile check error for user ${userExists.id}:`, profileError);
      } else {
        console.log(`Profile check for user ${userExists.id}:`, 
          count && count > 0 ? `Found ${count} profiles` : 'No profile found');
      }

      // Determine if the user has a profile based on the count from the query
      const hasProfile = count !== null && count > 0;
      console.log(`User ${userExists.id} has profile:`, hasProfile);

      return { user: userExists, hasProfile };
    }

    return null;
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
  
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();
  
  console.log(`Creating new user with email: ${normalizedEmail}`);
  
  try {
    // Create user in auth.users first
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: normalizedEmail,
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
          email: normalizedEmail,
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
            email: normalizedEmail,
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

export async function createProfileForExistingUser(supabaseClient: any, user: any, name: string, role: string, assignedProperties: string[] = []) {
  try {
    console.log(`Creating profile for existing user ${user.id}`);
    
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .insert([{
        id: user.id,
        email: user.email.toLowerCase().trim(),
        name: name,
        role: role,
        assigned_properties: role === 'manager' ? assignedProperties : []
      }])
      .select()
      .single();

    if (profileError) {
      console.error("Error creating profile for existing user:", profileError);
      throw profileError;
    }

    console.log("Profile created successfully for existing user");
    return profile;
  } catch (error) {
    console.error("Error in createProfileForExistingUser:", error);
    throw new Error(`Failed to create profile: ${error.message}`);
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
