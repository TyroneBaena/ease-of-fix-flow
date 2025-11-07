/**
 * Session Rehydration Utility v56.0 - Enhanced Logging
 * 
 * CHANGES IN v56.0:
 * - Added granular logging at each step for debugging
 * - Log session details to verify restoration
 * 
 * PREVIOUS FIXES (v51.0):
 * - Removed timeout from setSession() that was causing failures
 * - Let auth state listener complete asynchronously
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
 * v56.0 - Restore session from backend cookie with enhanced logging
 * Uses the app's singleton client so session propagates everywhere
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const startTime = Date.now();
  console.log("%c═══════════════════════════════════════════════════", "color: cyan; font-weight: bold");
  console.log("%c🔄 v57.0 - Starting session restoration with enhanced cookie handling", "color: cyan; font-weight: bold");
  console.log("%c═══════════════════════════════════════════════════", "color: cyan; font-weight: bold");

  try {
    // STEP 1: Check if we have any cookies at all
    console.log("🍪 v57.0 - Checking for auth cookies...");
    const allCookies = document.cookie;
    const hasAuthCookie = allCookies.includes('sb-auth-session');
    console.log("🍪 v57.0 - Has sb-auth-session cookie:", hasAuthCookie);
    console.log("🍪 v57.0 - Total cookies length:", allCookies.length);
    
    if (!hasAuthCookie && allCookies.length < 10) {
      console.warn("⚠️ v57.0 - No auth cookie found, session likely expired");
      return false;
    }
    
    // STEP 2: Fetch session from backend with retry
    console.log("📡 v57.0 - Fetching session from backend endpoint...");
    console.log("📡 v57.0 - Endpoint:", SESSION_ENDPOINT);
    
    const fetchStart = Date.now();
    const response = await fetch(SESSION_ENDPOINT, {
      method: "GET",
      credentials: "include", // CRITICAL: Send HttpOnly cookies
      headers: { 
        "Accept": "application/json",
        "Cache-Control": "no-cache", // Prevent cached responses
      },
    });
    const fetchDuration = Date.now() - fetchStart;

    console.log(`📡 v57.0 - Backend response received in ${fetchDuration}ms`);
    console.log(`📡 v57.0 - Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ v57.0 - Session endpoint returned error ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log("📡 v57.0 - Response data keys:", Object.keys(data));
    
    const session = data?.session || data?.data?.session || data?.data;

    // STEP 3: Validate session - CRITICAL early exit if null
    console.log("🔍 v57.0 - Validating session data...");
    
    if (!session || session === null) {
      console.error("❌ v57.0 - Session is explicitly NULL - cookies not sent or expired");
      console.error("❌ v57.0 - This means authentication has completely failed");
      return false;
    }
    
    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v57.0 - Invalid session structure (missing tokens)");
      console.warn("⚠️ v57.0 - Has access_token:", !!session?.access_token);
      console.warn("⚠️ v57.0 - Has refresh_token:", !!session?.refresh_token);
      return false;
    }

    console.log(`✅ v56.0 - Session validated for user: ${session.user?.email}`);
    console.log(`✅ v56.0 - Session expires at: ${session.expires_at}`);

    // STEP 3: Set session on app's singleton client WITHOUT timeout
    console.log("🔐 v56.0 - Setting session on Supabase client...");
    
    const setSessionStart = Date.now();
    const result = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    const setSessionDuration = Date.now() - setSessionStart;

    console.log(`🔐 v56.0 - setSession() completed in ${setSessionDuration}ms`);

    if (result.error) {
      console.error("❌ v56.0 - Failed to set session:", result.error.message);
      console.error("❌ v56.0 - Error details:", result.error);
      return false;
    }

    console.log("✅ v56.0 - Session set successfully");
    console.log("✅ v56.0 - Auth listener will complete user conversion asynchronously");

    const totalDuration = Date.now() - startTime;
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    console.log(`%c✅ v56.0 - Session restored in ${totalDuration}ms`, "color: lime; font-weight: bold");
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    return true;

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ v56.0 - Session restoration failed after ${totalDuration}ms:`, error);
    console.error("❌ v56.0 - Error details:", error);
    return false;
  }
}
