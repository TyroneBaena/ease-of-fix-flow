/**
 * Session Rehydration Utility v58.0 - Cookie Credentials Fix
 * 
 * CHANGES IN v58.0:
 * - Added explicit credentials mode and mode configuration
 * - Better error logging with response details
 * - Log full request configuration for debugging
 * 
 * PREVIOUS FIXES (v56.0):
 * - Added granular logging at each step for debugging
 * - Log session details to verify restoration
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
 * v58.0 - Restore session from backend cookie with credentials fix
 * Uses the app's singleton client so session propagates everywhere
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const startTime = Date.now();
  console.log("%c═══════════════════════════════════════════════════", "color: cyan; font-weight: bold");
  console.log("%c🔄 v58.0 - Starting session restoration", "color: cyan; font-weight: bold");
  console.log("%c═══════════════════════════════════════════════════", "color: cyan; font-weight: bold");

  try {
    // STEP 1: Fetch session from backend with explicit credentials
    console.log("📡 v58.0 - Fetching session from backend endpoint...");
    console.log("📡 v58.0 - Endpoint:", SESSION_ENDPOINT);
    console.log("📡 v58.0 - Origin:", window.location.origin);
    console.log("📡 v58.0 - Cookie count:", document.cookie.split(';').length);
    
    const fetchStart = Date.now();
    const response = await fetch(SESSION_ENDPOINT, {
      method: "GET",
      mode: "cors", // CRITICAL: Explicit CORS mode
      credentials: "include", // CRITICAL: Send HttpOnly cookies
      headers: { 
        "Accept": "application/json",
        "Origin": window.location.origin // CRITICAL: Explicit origin for CORS
      },
    });
    const fetchDuration = Date.now() - fetchStart;

    console.log(`📡 v58.0 - Backend response received in ${fetchDuration}ms`);
    console.log(`📡 v58.0 - Status: ${response.status} ${response.statusText}`);
    console.log(`📡 v58.0 - Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error(`❌ v58.0 - Session endpoint returned error ${response.status}`);
      const errorText = await response.text();
      console.error(`❌ v58.0 - Error response:`, errorText);
      return false;
    }

    const data = await response.json();
    console.log("📡 v58.0 - Response data:", {
      hasSession: !!data.session,
      reason: data.reason,
      error: data.error,
      keys: Object.keys(data)
    });
    
    const session = data?.session || data?.data?.session || data?.data;

    // STEP 2: Validate session
    console.log("🔍 v58.0 - Validating session data...");
    
    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v58.0 - No valid session");
      console.warn("⚠️ v58.0 - Reason:", data.reason);
      console.warn("⚠️ v58.0 - Has session object:", !!session);
      console.warn("⚠️ v58.0 - Has access_token:", !!session?.access_token);
      console.warn("⚠️ v58.0 - Has refresh_token:", !!session?.refresh_token);
      return false;
    }

    console.log(`✅ v58.0 - Session validated for user: ${session.user?.email}`);
    console.log(`✅ v58.0 - Session expires at: ${new Date(session.expires_at * 1000).toISOString()}`);
    console.log(`✅ v58.0 - Token length: ${session.access_token.length}`);

    // STEP 3: Set session on app's singleton client WITHOUT timeout
    console.log("🔐 v58.0 - Setting session on Supabase client...");
    
    const setSessionStart = Date.now();
    const result = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    const setSessionDuration = Date.now() - setSessionStart;

    console.log(`🔐 v58.0 - setSession() completed in ${setSessionDuration}ms`);

    if (result.error) {
      console.error("❌ v58.0 - Failed to set session:", result.error.message);
      console.error("❌ v58.0 - Error details:", result.error);
      return false;
    }

    if (!result.data?.session) {
      console.error("❌ v58.0 - setSession() returned no session");
      return false;
    }

    console.log("✅ v58.0 - Session set successfully");
    console.log("✅ v58.0 - User ID:", result.data.session.user.id);
    console.log("✅ v58.0 - Auth listener will complete user conversion asynchronously");

    const totalDuration = Date.now() - startTime;
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    console.log(`%c✅ v58.0 - Session restored in ${totalDuration}ms`, "color: lime; font-weight: bold");
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    return true;

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`❌ v58.0 - Session restoration failed after ${totalDuration}ms:`, error);
    console.error("❌ v58.0 - Error name:", error instanceof Error ? error.name : 'Unknown');
    console.error("❌ v58.0 - Error message:", error instanceof Error ? error.message : error);
    console.error("❌ v58.0 - Error stack:", error instanceof Error ? error.stack : 'No stack');
    return false;
  }
}
