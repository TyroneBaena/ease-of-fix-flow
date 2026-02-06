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
import { supabase } from "@/integrations/supabase/client"; // ✅ Use the singleton directly

// 🌐 Direct Supabase Edge Function URLs (NEVER use VITE_* variables in Lovable)
const LOGIN_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/login";
const LOGOUT_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/logout";
const SESSION_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";

/**
 * 🔐 Sign in with email and password (via Supabase Edge Function)
 */
export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log("🔐 Attempting sign in for:", email);

    // 🔹 Validation
    if (!email || !password) {
      toast.error("Email and password are required");
      return { user: null, error: { message: "Missing credentials" } };
    }

    // 🔹 1. Call Edge Function `/login`
    const response = await fetch(LOGIN_FN, {
      method: "POST",
      credentials: "include", // includes cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result?.error || "Invalid login credentials";
      console.error("❌ Login failed:", message);
      toast.error(message);
      return { user: null, error: { message } };
    }

    console.log("✅ Login successful, rehydrating session...");

    // 🔹 2. Get session directly from login response (no need for separate call)
    const session = result?.session;
    const user = session?.user || null;

    if (!user || !session) {
      toast.error("Unable to retrieve session from login response");
      return { user: null, error: { message: "No session returned from login" } };
    }

    // 🔹 3. Rehydrate Supabase client with session tokens
    // CRITICAL: Use the SAME supabase instance that UnifiedAuthContext is listening to
    if (session.access_token && session.refresh_token) {
      console.log("🔄 Setting session on Supabase client...");
      const { error: setError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      
      if (setError) {
        console.error("❌ Failed to set session in client:", setError);
        toast.error("Session setup failed");
        return { user: null, error: setError };
      }
      
      // v38.0 PERFORMANCE: Trust setSession() - no verification loop needed
      // The Edge Function already validated credentials and returned a valid session
      // UnifiedAuthContext's auth listener will handle user conversion asynchronously
      console.log("✅ Session set successfully, auth listener will handle user conversion");
    }

    console.log("✅ Login complete for:", user.email);
    toast.success("Signed in successfully!");

    return { user, error: null };
  } catch (error: any) {
    console.error("❌ Login exception:", error);
    toast.error("Login failed. Please check your network and try again.");
    return { user: null, error: { message: error.message } };
  }
};

/**
 * 🔓 Sign out current user (via Supabase Edge Function)
 */
export const signOutUser = async () => {
  try {
    console.log("🔐 Signing out...");

    // v38.0 PERFORMANCE: Parallelize cookie clear and client signOut
    // Both operations are independent - run them concurrently
    await Promise.all([
      fetch(LOGOUT_FN, { method: "POST", credentials: "include" }).catch((e) => {
        console.warn("⚠️ Logout edge function error (non-blocking):", e);
      }),
      supabase.auth.signOut().catch((e) => {
        console.warn("⚠️ Supabase signOut error (non-blocking):", e);
      }),
    ]);

    console.log("✅ Logged out successfully");
    toast.success("Signed out successfully");

    // v38.0 PERFORMANCE: Redirect immediately - no delay needed
    // State is already cleared when redirect happens
    window.location.href = "/login";

    return { error: null };
  } catch (error: any) {
    console.error("❌ Sign out exception:", error);
    toast.error("An error occurred during sign out");
    window.location.href = "/login";
    return { error };
  }
};

/**
 * 👤 Update user role (directly in Supabase)
 */
export const updateUserRole = async (userId: string, role: UserRole) => {
  try {
    console.log(`🔐 Updating user role: ${userId} → ${role}`);

    // Use singleton instance
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
