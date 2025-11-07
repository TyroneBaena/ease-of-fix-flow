/**
 * Session Rehydration Utility v66.0 - Timeout & Dual-Path Fix
 * 
 * CHANGES IN v66.0:
 * - Added 15-second timeout to /session endpoint fetch
 * - Implements timeout using AbortController for proper cleanup
 * - Returns detailed error reasons for fallback logic
 * 
 * PREVIOUS FIXES (v58.0):
 * - Added explicit credentials mode and mode configuration
 * - Better error logging with response details
 * 
 * APPROACH:
 * 1. Fetch session from backend (/session endpoint with cookies) with 15s timeout
 * 2. Use app's singleton Supabase client
 * 3. Set session using setSession() WITHOUT timeout (let it complete naturally)
 * 4. Auth state listener will handle user conversion asynchronously
 * 5. Return success/failure with error reason for fallback handling
 */

import { supabaseClient } from "@/integrations/supabase/client";

const SESSION_ENDPOINT = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";

/**
 * v66.0 - Restore session from backend cookie with 15s timeout
 * Uses the app's singleton client so session propagates everywhere
 * Returns { success: boolean; reason?: string } for dual-path fallback
 */
export async function rehydrateSessionFromServer(): Promise<{ success: boolean; reason?: string }> {
  const startTime = Date.now();
  console.log("%c═══════════════════════════════════════════════════", "color: cyan; font-weight: bold");
  console.log("%c🔄 v66.0 - Starting session restoration with 15s timeout", "color: cyan; font-weight: bold");
  console.log("%c═══════════════════════════════════════════════════", "color: cyan; font-weight: bold");

  // CRITICAL v66.0: Create AbortController for 15-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn("⏱️ v66.0 - /session fetch timeout after 15s");
  }, 15000);

  try {
    // STEP 1: Fetch session from backend with explicit credentials and timeout
    console.log("📡 v66.0 - Fetching session from backend endpoint...");
    console.log("📡 v66.0 - Endpoint:", SESSION_ENDPOINT);
    console.log("📡 v66.0 - Origin:", window.location.origin);
    console.log("📡 v66.0 - Cookie count:", document.cookie.split(';').length);
    console.log("📡 v66.0 - Timeout: 15 seconds");
    
    const fetchStart = Date.now();
    const response = await fetch(SESSION_ENDPOINT, {
      method: "GET",
      mode: "cors", // CRITICAL: Explicit CORS mode
      credentials: "include", // CRITICAL: Send HttpOnly cookies
      headers: { 
        "Accept": "application/json",
        "Origin": window.location.origin // CRITICAL: Explicit origin for CORS
      },
      signal: controller.signal, // CRITICAL v66.0: Add abort signal
    });
    const fetchDuration = Date.now() - fetchStart;
    clearTimeout(timeoutId); // Clear timeout on successful fetch

    console.log(`📡 v66.0 - Backend response received in ${fetchDuration}ms`);
    console.log(`📡 v66.0 - Status: ${response.status} ${response.statusText}`);
    console.log(`📡 v66.0 - Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      clearTimeout(timeoutId);
      console.error(`❌ v66.0 - Session endpoint returned error ${response.status}`);
      const errorText = await response.text();
      console.error(`❌ v66.0 - Error response:`, errorText);
      return { success: false, reason: `http_${response.status}` };
    }

    const data = await response.json();
    console.log("📡 v66.0 - Response data:", {
      hasSession: !!data.session,
      reason: data.reason,
      error: data.error,
      keys: Object.keys(data)
    });
    
    const session = data?.session || data?.data?.session || data?.data;

    // STEP 2: Validate session
    console.log("🔍 v66.0 - Validating session data...");
    
    if (!session?.access_token || !session?.refresh_token) {
      clearTimeout(timeoutId);
      console.warn("⚠️ v66.0 - No valid session");
      console.warn("⚠️ v66.0 - Reason:", data.reason);
      console.warn("⚠️ v66.0 - Has session object:", !!session);
      console.warn("⚠️ v66.0 - Has access_token:", !!session?.access_token);
      console.warn("⚠️ v66.0 - Has refresh_token:", !!session?.refresh_token);
      return { success: false, reason: data.reason || 'no_valid_session' };
    }

    console.log(`✅ v66.0 - Session validated for user: ${session.user?.email}`);
    console.log(`✅ v66.0 - Session expires at: ${new Date(session.expires_at * 1000).toISOString()}`);
    console.log(`✅ v66.0 - Token length: ${session.access_token.length}`);

    // STEP 3: Set session on app's singleton client WITHOUT timeout
    console.log("🔐 v66.0 - Setting session on Supabase client...");
    
    const setSessionStart = Date.now();
    const result = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    const setSessionDuration = Date.now() - setSessionStart;
    clearTimeout(timeoutId);

    console.log(`🔐 v66.0 - setSession() completed in ${setSessionDuration}ms`);

    if (result.error) {
      console.error("❌ v66.0 - Failed to set session:", result.error.message);
      console.error("❌ v66.0 - Error details:", result.error);
      return { success: false, reason: 'set_session_error' };
    }

    if (!result.data?.session) {
      console.error("❌ v66.0 - setSession() returned no session");
      return { success: false, reason: 'no_session_returned' };
    }

    console.log("✅ v66.0 - Session set successfully");
    console.log("✅ v66.0 - User ID:", result.data.session.user.id);
    console.log("✅ v66.0 - Auth listener will complete user conversion asynchronously");

    const totalDuration = Date.now() - startTime;
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    console.log(`%c✅ v66.0 - Session restored in ${totalDuration}ms`, "color: lime; font-weight: bold");
    console.log("%c═══════════════════════════════════════════════════", "color: lime; font-weight: bold");
    return { success: true };

  } catch (error) {
    clearTimeout(timeoutId);
    const totalDuration = Date.now() - startTime;
    
    // v66.0: Detect timeout vs other errors
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || controller.signal.aborted);
    const reason = isTimeout ? 'timeout' : 'fetch_error';
    
    console.error(`❌ v66.0 - Session restoration failed after ${totalDuration}ms:`, error);
    console.error("❌ v66.0 - Error name:", error instanceof Error ? error.name : 'Unknown');
    console.error("❌ v66.0 - Error message:", error instanceof Error ? error.message : error);
    console.error("❌ v66.0 - Error reason:", reason);
    console.error("❌ v66.0 - Is timeout:", isTimeout);
    
    return { success: false, reason };
  }
}
