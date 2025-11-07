/**
 * Session Rehydration Utility v58.0 - Cookie Domain Fix & Less Aggressive Detection
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
  console.log("%c🔄 v58.0 - Starting session restoration (less aggressive)", "color: cyan; font-weight: bold");
  console.log("%c═══════════════════════════════════════════════════", "color: cyan; font-weight: bold");

  try {
    // v59.0: CRITICAL FIX - Check for cookie existence first
    console.log("🍪 v59.0 - Checking for auth cookies...");
    const allCookies = document.cookie;
    const hasAuthCookie = allCookies.includes('sb-auth-session');
    console.log("🍪 v59.0 - Has sb-auth-session cookie:", hasAuthCookie);
    
    if (!hasAuthCookie) {
      console.warn("⚠️ v59.0 - No cookie found, skipping backend call");
      return false; // Don't waste time calling backend if no cookie exists
    }
    
    // STEP 1: Fetch session from backend
    console.log("📡 v58.0 - Fetching session from backend endpoint...");
    console.log("📡 v58.0 - Endpoint:", SESSION_ENDPOINT);
    
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

    console.log(`📡 v58.0 - Backend response received in ${fetchDuration}ms`);
    console.log(`📡 v58.0 - Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ v58.0 - Session endpoint returned error ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log("📡 v58.0 - Response data keys:", Object.keys(data));
    
    const session = data?.session || data?.data?.session || data?.data;

    // STEP 2: Validate session
    console.log("🔍 v58.0 - Validating session data...");
    
    if (!session || session === null) {
      console.warn("⚠️ v58.0 - Session is NULL - will retry on next visit");
      return false;
    }
    
    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v58.0 - Invalid session structure (missing tokens)");
      return false;
    }

    console.log(`✅ v58.0 - Session validated for user: ${session.user?.email}`);
    console.log(`✅ v58.0 - Session expires at: ${session.expires_at}`);

    // STEP 3: Set session on app's singleton client
    console.log("🔐 v56.0 - Setting session on Supabase client...");
    
    const setSessionStart = Date.now();
    const result = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    const setSessionDuration = Date.now() - setSessionStart;

    console.log(`🔐 v58.0 - setSession() completed in ${setSessionDuration}ms`);

    if (result.error) {
      console.error("❌ v58.0 - Failed to set session:", result.error.message);
      return false;
    }

    console.log("✅ v58.0 - Session set successfully");

    const totalDuration = Date.now() - startTime;
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    console.log(`%c✅ v58.0 - Session restored in ${totalDuration}ms`, "color: lime; font-weight: bold");
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    return true;

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ v58.0 - Session restoration failed after ${totalDuration}ms:`, error);
    return false;
  }
}
