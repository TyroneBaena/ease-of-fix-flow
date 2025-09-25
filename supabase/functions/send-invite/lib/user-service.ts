
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UserCheckResult } from "./types.ts";

export async function findExistingUser(supabaseClient: any, email: string): Promise<UserCheckResult> {
  if (!email) {
    console.error("Missing email in findExistingUser");
    throw new Error("Email is required to check for existing users");
  }
  
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
      
      const profileUserId = existingProfiles[0].id;
      console.log(`Checking auth user for profile ID: ${profileUserId}`);
      
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(profileUserId);
      
      if (!authError && authUser) {
        console.log(`Found matching auth user for profile: ${profileUserId}`);
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
    
    // Then check using the admin API for exact email match
    console.log(`Checking auth.users for email: ${normalizedEmail}`);
    
    try {
      const { data: userByEmail, error: userError } = await supabaseClient.auth.admin.listUsers({
        filter: {
          email: normalizedEmail
        }
      });
      
      if (userError) {
        console.error(`Error checking auth.users: ${userError.message}`);
        throw userError;
      }
      
      if (userByEmail?.users?.length > 0) {
        console.log(`Found ${userByEmail.users.length} users with email ${normalizedEmail}`);
        
        // Check if any of the users have the exact matching email (case insensitive)
        const matchingUser = userByEmail.users.find((u: any) => 
          u.email && u.email.toLowerCase() === normalizedEmail.toLowerCase()
        );
        
        if (!matchingUser) {
          console.log(`No exact match found for email ${normalizedEmail}`);
          return { exists: false };
        }
        
        console.log(`Found exact match for email ${normalizedEmail} with user ID ${matchingUser.id}`);
        const userExists = matchingUser;
        
        const { data: profile, error: profileError, count } = await supabaseClient
          .from('profiles')
          .select('*', { count: 'exact' })
          .eq('id', userExists.id);
  
        const hasProfile = count !== null && count > 0;
        const isPlaceholder = userExists.user_metadata?.isPlaceholderUser === true;
  
        console.log(`User ${userExists.id} - Has profile: ${hasProfile}, Is placeholder: ${isPlaceholder}`);
        return { 
          user: userExists, 
          hasProfile, 
          exists: true, 
          isPlaceholder,
          email: normalizedEmail,
          profile: hasProfile && profile ? profile[0] : null
        };
      }
    } catch (error) {
      console.error("Error checking auth.users:", error);
      // Don't throw here, just log and continue to return "not exists" result
    }
    
    console.log(`No user found with email ${normalizedEmail}`);
    return { exists: false };
  } catch (error) {
    console.error("Error in findExistingUser:", error);
    // Return not exists in case of error, to avoid edge function failure
    return { exists: false };
  }
}

export async function createNewUser(supabaseClient: any, email: string, name: string, role: string, temporaryPassword: string, assignedProperties: string[] = [], invitingUserId?: string) {
  if (!email || !name || !role || !temporaryPassword) {
    console.error("Missing required parameters in createNewUser");
    throw new Error("Email, name, role, and temporaryPassword are required to create a user");
  }
  
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();
  
  console.log(`Creating new user with email: ${normalizedEmail}`);
  
  // Get the inviting user's organization to assign the new user to the same organization
  let targetOrganizationId = null;
  let organizationCode = null;
  if (invitingUserId) {
    console.log(`Getting organization for inviting user: ${invitingUserId}`);
    try {
      const { data: invitingUserProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('organization_id')
        .eq('id', invitingUserId)
        .single();
      
      console.log('Inviting user profile lookup result:', { 
        invitingUserId, 
        profile: invitingUserProfile, 
        error: profileError?.message 
      });
      
      if (!profileError && invitingUserProfile?.organization_id) {
        targetOrganizationId = invitingUserProfile.organization_id;
        console.log(`✅ New user will be assigned to organization: ${targetOrganizationId}`);
        
        // Get organization code for Phase 3
        const { data: orgData, error: orgError } = await supabaseClient
          .from('organizations')
          .select('organization_code, name')
          .eq('id', targetOrganizationId)
          .single();
        
        if (!orgError && orgData) {
          organizationCode = orgData.organization_code;
          console.log(`Phase 3: Found organization code ${organizationCode} for organization ${orgData.name}`);
        }
      } else {
        console.error(`❌ Could not get organization for inviting user ${invitingUserId}:`, profileError?.message);
      }
    } catch (error) {
      console.error(`❌ Exception getting inviting user's organization:`, error);
    }
  } else {
    console.error(`❌ No inviting user ID provided - user will get a new organization`);
  }
  
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
        isPlaceholderUser: false, // Mark as a real user from the beginning
        organization_id: targetOrganizationId,
        organization_code: organizationCode
      }
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }
    
    console.log("Auth user created successfully:", authData.user.id);

    // Create the profile manually to ensure it exists with correct organization
    try {
      console.log(`Creating profile for new user with organization: ${targetOrganizationId}`);
      
      // First check if profile already exists (in case of partial failure)
      const { data: existingProfile, error: checkError } = await supabaseClient
        .from('profiles')
        .select('id, organization_id')
        .eq('id', authData.user.id)
        .single();
      
      if (existingProfile) {
        console.log(`Profile already exists for user ${authData.user.id}, updating instead`);
        const { data: profile, error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            email: normalizedEmail,
            name: name,
            role: role,
            assigned_properties: role === 'manager' ? assignedProperties : [],
            organization_id: targetOrganizationId,
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id)
          .select()
          .single();

        if (updateError) {
          console.error("❌ Error updating existing user profile:", updateError);
          throw new Error(`Failed to update user profile: ${updateError.message}`);
        } else {
          console.log("✅ Profile updated successfully:", profile?.id, "with organization:", profile?.organization_id);
        }
      } else {
        // Profile doesn't exist, create it
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: normalizedEmail,
            name: name,
            role: role,
            assigned_properties: role === 'manager' ? assignedProperties : [],
            organization_id: targetOrganizationId
          }])
          .select()
          .single();

        if (profileError) {
          console.error("❌ Error creating user profile:", profileError);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        } else {
          console.log("✅ Profile created successfully:", profile?.id, "with organization:", profile?.organization_id);
        }
      }
    } catch (profileError) {
      console.error("❌ Exception creating user profile:", profileError);
      throw new Error(`Failed to create user profile: ${(profileError as Error).message}`);
    }
    
    return authData.user;
  } catch (error) {
    console.error("Error in createNewUser:", error);
    
    throw new Error(`Failed to create new user: ${(error as Error).message}`);
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
