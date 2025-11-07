/**
 * Session Rehydration Utility v51.0 - Removed Timeout Deadlock
 * 
 * CRITICAL FIX: Removed timeout from setSession() that was causing failures.
 * The timeout was forcing failures before auth state listener could complete.
 * 
 * APPROACH:
 * 1. Fetch session from backend (/session endpoint with cookies)
 * 2. Use app's singleton Supabase client
 * 3. Set session using setSession() WITHOUT timeout (let it complete naturally)
 * 4. Auth state listener will handle user conversion asynchronously
 * 5. Return success/failure based on setSession() result only
 */

import { supabaseClient } from "@/integrations/supabase/client";

const SESSION_ENDPOINT = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";

/**
 * Restore session from backend cookie with timeout protection
 * Uses the app's singleton client so session propagates everywhere
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const startTime = Date.now();
  console.log("%c🔄 v51.0 - Starting session restoration without timeout", "color: cyan; font-weight: bold");

  try {
    // STEP 1: Fetch session from backend
    console.log("📡 v51.0 - Fetching session from backend...");
    const response = await fetch(SESSION_ENDPOINT, {
      method: "GET",
      credentials: "include", // Send HttpOnly cookies
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.error(`❌ v51.0 - Session endpoint returned ${response.status}`);
      return false;
    }

    const data = await response.json();
    const session = data?.session || data?.data?.session || data?.data;

    // STEP 2: Validate session
    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v51.0 - No valid session (cookie expired or missing)");
      return false;
    }

    console.log(`✅ v51.0 - Session received for user: ${session.user?.email}`);

    // STEP 3: Set session on app's singleton client WITHOUT timeout
    // The auth state listener will handle user conversion asynchronously
    // We don't need to wait for it to complete - just verify setSession succeeds
    console.log("🔐 v51.0 - Setting session on app's singleton client (no timeout)...");
    
    const result = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (result.error) {
      console.error("❌ v51.0 - Failed to set session:", result.error.message);
      return false;
    }

    console.log("✅ v51.0 - Session set successfully, auth listener will complete conversion");

    const duration = Date.now() - startTime;
    console.log(`%c✅ v51.0 - Session restored in ${duration}ms`, "color: lime; font-weight: bold");
    return true;

  } catch (error) {
    console.error("❌ v51.0 - Session restoration failed:", error);
    return false;
  }
}
