// import { supabase } from '@/lib/supabase';
// import { toast } from '@/lib/toast';
// import { UserRole } from '@/types/user';

// /**
//  * Sign in with email and password
//  */
// export const signInWithEmailPassword = async (email: string, password: string) => {
//   try {
//     console.log('🔐 Attempting sign in for:', email);

//     // Basic validation
//     if (!email || !password) {
//       const errorMsg = 'Email and password are required';
//       toast.error(errorMsg);
//       return { user: null, error: { message: errorMsg } };
//     }

//     const { data, error } = await supabase.auth.signInWithPassword({
//       email: email.trim().toLowerCase(),
//       password,
//     });

//     if (error) {
//       console.error('🔐 Sign in error:', error);

//       // Provide user-friendly error messages
//       let friendlyError = error.message;
//       if (error.message?.toLowerCase().includes('email not confirmed') ||
//           error.message?.includes('email_not_confirmed')) {
//         friendlyError = 'Please check your email and click the confirmation link before signing in.';
//       } else if (error.message?.includes('Invalid login credentials')) {
//         friendlyError = 'Invalid email or password. Please check your credentials.';
//       } else if (error.message?.includes('Too many requests')) {
//         friendlyError = 'Too many login attempts. Please wait a moment and try again.';
//       } else if (error.message?.includes('Network error')) {
//         friendlyError = 'Network error. Please check your connection.';
//       }

//       toast.error(friendlyError);
//       return { user: null, error: { ...error, message: friendlyError } };
//     }

//     if (data.user) {
//       console.log('🔐 Sign in successful:', data.user.email);
//       toast.success('Signed in successfully!');
//       return { user: data.user, error: null };
//     }

//     const unknownError = { message: 'Unknown sign in error occurred' };
//     toast.error(unknownError.message);
//     return { user: null, error: unknownError };
//   } catch (error: any) {
//     console.error('🔐 Sign in exception:', error);
//     const networkError = 'Network error. Please check your connection and try again.';
//     toast.error(networkError);
//     return { user: null, error: { message: networkError } };
//   }
// };

// /**
//  * Sign out current user with comprehensive cleanup
//  */
// export const signOutUser = async () => {
//   try {
//     console.log('🔐 Starting sign out process...');

//     // Check if user is actually signed in
//     const { data: { session } } = await supabase.auth.getSession();

//     if (!session) {
//       console.log('🔐 No active session found');
//       toast.info('Already signed out');
//       return { error: null };
//     }

//     console.log('🔐 Active session found, proceeding with sign out...');

//     // Attempt global sign out (signs out from all sessions)
//     const { error } = await supabase.auth.signOut({ scope: 'global' });

//     if (error) {
//       console.error('🔐 Sign out error:', error);
//       // Don't show error toast for certain expected errors
//       if (!error.message.includes('session_not_found') && !error.message.includes('invalid_token')) {
//         toast.error(`Sign out error: ${error.message}`);
//       }
//     } else {
//       console.log('🔐 Sign out successful');
//       toast.success('Signed out successfully');
//     }

//     // Force page refresh to clear any remaining state
//     setTimeout(() => {
//       window.location.href = '/login';
//     }, 100);

//     return { error };
//   } catch (error: any) {
//     console.error('🔐 Sign out exception:', error);
//     toast.error('An error occurred during sign out');

//     // Force redirect anyway for recovery
//     setTimeout(() => {
//       window.location.href = '/login';
//     }, 500);

//     return { error };
//   }
// };

// /**
//  * Update user role in both profiles and auth metadata
//  */
// export const updateUserRole = async (userId: string, role: UserRole) => {
//   try {
//     console.log(`🔐 Updating user role: ${userId} -> ${role}`);

//     // Update role in profiles table first
//     const { data: profile, error: profileError } = await supabase
//       .from('profiles')
//       .update({ role })
//       .eq('id', userId)
//       .select()
//       .maybeSingle();

//     if (profileError) {
//       console.error('🔐 Profile update error:', profileError);
//       throw profileError;
//     }

//     console.log('🔐 Profile updated successfully');

//     // Also update in auth.users metadata for consistency
//     try {
//       const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
//         userId,
//         {
//           user_metadata: {
//             role: role
//           }
//         }
//       );

//       if (authError) {
//         console.warn('🔐 Auth metadata update warning (non-critical):', authError);
//         // Don't throw here as profile update was successful
//       } else {
//         console.log('🔐 Auth metadata updated successfully');
//       }
//     } catch (authUpdateError) {
//       console.warn('🔐 Auth metadata update failed (non-critical):', authUpdateError);
//       // Continue as profile update was successful
//     }

//     // Fetch updated profile to return
//     const { data: updatedProfile, error: fetchError } = await supabase
//       .from('profiles')
//       .select('*')
//       .eq('id', userId)
//       .maybeSingle();

//     if (fetchError) {
//       console.error('🔐 Updated profile fetch error:', fetchError);
//       // Return the profile we just updated
//       return { profile, error: null };
//     }

//     console.log('🔐 User role update completed successfully');
//     toast.success(`User role updated to ${role}`);

//     return { profile: updatedProfile, error: null };
//   } catch (error: any) {
//     console.error('🔐 User role update error:', error);
//     toast.error(`Failed to update user role: ${error.message}`);
//     return { profile: null, error };
//   }
// };

import { toast } from "@/lib/toast";
import { UserRole } from "@/types/user";
import { getSupabaseClient } from "@/integrations/supabase/client";

// 🌐 Environment variables for Edge Functions
const LOGIN_FN = import.meta.env.VITE_LOGIN_FN_URL!;
const LOGOUT_FN = import.meta.env.VITE_LOGOUT_FN_URL!;
const SESSION_FN = import.meta.env.VITE_SESSION_FN_URL!;

/**
 * Sign in with email and password (via Edge Function)
 */
export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log("🔐 Attempting sign in for:", email);

    if (!email || !password) {
      const errorMsg = "Email and password are required";
      toast.error(errorMsg);
      return { user: null, error: { message: errorMsg } };
    }

    // 🔹 1. Call login Edge Function
    const response = await fetch(LOGIN_FN, {
      method: "POST",
      credentials: "include", // crucial for cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result.error || "Invalid login credentials";
      toast.error(message);
      return { user: null, error: { message } };
    }

    console.log("✅ Login success, rehydrating session...");

    // 🔹 2. Immediately fetch the session (rehydration)
    const sessionResponse = await fetch(SESSION_FN, {
      method: "GET",
      credentials: "include",
    });

    if (!sessionResponse.ok) {
      toast.error("Failed to restore session after login");
      return { user: null, error: { message: "Session fetch failed" } };
    }

    const sessionData = await sessionResponse.json();
    const user = sessionData?.user || null;

    if (!user) {
      toast.error("Unable to fetch user from session");
      return { user: null, error: { message: "No user returned from session" } };
    }

    console.log("✅ Rehydrated session for:", user.email);
    toast.success("Signed in successfully!");

    // Optionally reset the client instance
    getSupabaseClient();

    return { user, error: null };
  } catch (error: any) {
    console.error("❌ Login failed:", error);
    toast.error("Login failed. Please check your network and try again.");
    return { user: null, error: { message: error.message } };
  }
};

/**
 * Sign out current user (via Edge Function)
 */
export const signOutUser = async () => {
  try {
    console.log("🔐 Signing out...");

    // 🔹 1. Call logout Edge Function
    const response = await fetch(LOGOUT_FN, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const result = await response.json();
      toast.error(result.error || "Sign out failed");
      return { error: result };
    }

    console.log("✅ Logged out successfully");
    toast.success("Signed out successfully");

    // 🔹 2. Clear state and redirect
    setTimeout(() => {
      window.location.href = "/login";
    }, 300);

    return { error: null };
  } catch (error: any) {
    console.error("❌ Sign out failed:", error);
    toast.error("An error occurred during sign out");
    setTimeout(() => (window.location.href = "/login"), 500);
    return { error };
  }
};

/**
 * Update user role (this stays mostly same)
 */
export const updateUserRole = async (userId: string, role: UserRole) => {
  try {
    console.log(`🔐 Updating user role: ${userId} -> ${role}`);

    const supabase = getSupabaseClient();

    // Update role in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (profileError) throw profileError;

    toast.success(`User role updated to ${role}`);
    return { profile, error: null };
  } catch (error: any) {
    console.error("🔐 User role update error:", error);
    toast.error(`Failed to update user role: ${error.message}`);
    return { profile: null, error };
  }
};
