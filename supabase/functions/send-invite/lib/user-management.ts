
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
    // First check in profiles table which is more reliable for our app
    const { data: existingProfiles, error: profilesError, count } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact' })
      .ilike('email', normalizedEmail);
      
    if (!profilesError && count && count > 0) {
      console.log(`Found ${count} existing profiles with email ${normalizedEmail} in profiles table`);
      
      // Get the auth user data for this profile
      const profileUserId = existingProfiles[0].id;
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(profileUserId);
      
      if (!authError && authUser) {
        return { 
          user: authUser.user, 
          hasProfile: true, 
          exists: true, 
          isPlaceholder: false,
          email: normalizedEmail,
          profile: existingProfiles[0]
        };
      }
    }
    
    // Then check using the admin API as fallback
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
    console.log(`User search result from admin API:`, existingUsers?.users?.length > 0 
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

      // Determine if the user has a profile based on the count from the query
      const hasProfile = count !== null && count > 0;
      console.log(`User ${userExists.id} has profile:`, hasProfile);
      
      // Check if this is one of our existing users or a placeholder user
      // Look for a specific metadata marker we'll add for placeholder users
      const isPlaceholder = userExists.user_metadata?.isPlaceholderUser === true;
      console.log(`User ${userExists.id} is placeholder:`, isPlaceholder);

      return { 
        user: userExists, 
        hasProfile, 
        exists: true, 
        isPlaceholder,
        email: normalizedEmail,
        profile: hasProfile && profile ? profile[0] : null
      };
    }
    
    console.log("No user found with this email");
    return { exists: false };
  } catch (error) {
    console.error("Error in findExistingUser:", error);
    throw new Error(`Failed to check for existing user: ${(error as Error).message}`);
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
          isPlaceholderUser: false // Mark this as a real user now
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
    throw new Error(`Failed to update user: ${(error as Error).message}`);
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
    // Double check that user doesn't exist before creating
    const existingCheck = await findExistingUser(supabaseClient, normalizedEmail);
    
    if (existingCheck.exists) {
      throw new Error(`A user with email ${normalizedEmail} already exists`);
    }
    
    // Create user in auth.users first
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        assignedProperties: role === 'manager' ? assignedProperties : [],
        isPlaceholderUser: false // Mark as a real user from the beginning
      }
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }
    
    console.log("Auth user created successfully:", authData.user.id);

    // Create the profile manually to ensure it exists
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
    
    return authData.user;
  } catch (error) {
    console.error("Error in createNewUser:", error);
    throw new Error(`Failed to create new user: ${(error as Error).message}`);
  }
}

export async function createProfileForExistingUser(supabaseClient: any, user: any, name: string, role: string, assignedProperties: string[] = []) {
  try {
    console.log(`Creating profile for existing user ${user.id}`);
    
    // First check if profile already exists
    const { data: existingProfile, error: checkError, count } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('id', user.id);
      
    // If profile already exists, update it instead of creating a new one
    if (count && count > 0) {
      console.log(`Profile already exists for user ${user.id}, updating instead`);
      const { data: updatedProfile, error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          name: name,
          role: role,
          assigned_properties: role === 'manager' ? assignedProperties : [],
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (updateError) {
        console.error("Error updating existing profile:", updateError);
        throw updateError;
      }
      
      console.log("Profile updated successfully for existing user");
      return updatedProfile;
    }
    
    // Otherwise create a new profile
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
    throw new Error(`Failed to create profile: ${(error as Error).message}`);
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
