/**
 * Session Rehydration Utility v49.0 - Fixed Client Instance
 * 
 * CRITICAL FIX: Use the app's singleton Supabase client instead of creating
 * a throwaway client. This ensures session propagates to the entire app.
 * 
 * APPROACH:
 * 1. Fetch session from backend (/session endpoint with cookies)
 * 2. Use app's singleton Supabase client
 * 3. Set session using setSession()
 * 4. Wait briefly for propagation
 * 5. Return success/failure
 */

import { supabaseClient } from "@/integrations/supabase/client";

const SESSION_ENDPOINT = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";

/**
 * Restore session from backend cookie
 * Uses the app's singleton client so session propagates everywhere
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const startTime = Date.now();
  console.log("%c🔄 v49.0 - Starting session restoration", "color: cyan; font-weight: bold");

  try {
    // STEP 1: Fetch session from backend
    console.log("📡 v49.0 - Fetching session from backend...");
    const response = await fetch(SESSION_ENDPOINT, {
      method: "GET",
      credentials: "include", // Send HttpOnly cookies
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.error(`❌ v49.0 - Session endpoint returned ${response.status}`);
      return false;
    }

    const data = await response.json();
    const session = data?.session || data?.data?.session || data?.data;

    // STEP 2: Validate session
    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v49.0 - No valid session (cookie expired or missing)");
      return false;
    }

    console.log(`✅ v49.0 - Session received for user: ${session.user?.email}`);

    // STEP 3: Set session on app's singleton client (CRITICAL FIX)
    console.log("🔐 v49.0 - Setting session on app's singleton client...");
    const { error } = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error("❌ v49.0 - Failed to set session:", error.message);
      return false;
    }

    console.log("✅ v49.0 - Session set successfully on singleton client");

    // STEP 4: Brief wait for auth state propagation
    console.log("⏳ v49.0 - Waiting for session propagation...");
    await new Promise(resolve => setTimeout(resolve, 200));

    const duration = Date.now() - startTime;
    console.log(`%c✅ v49.0 - Session restored in ${duration}ms`, "color: lime; font-weight: bold");
    return true;

  } catch (error) {
    console.error("❌ v49.0 - Session restoration failed:", error);
    return false;
  }
}
