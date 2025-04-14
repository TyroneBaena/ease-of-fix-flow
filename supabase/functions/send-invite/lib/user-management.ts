
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
  
  // Update in auth
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
  
  const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true, // Auto-confirm the email
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
