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
