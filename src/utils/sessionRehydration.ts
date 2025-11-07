/**
 * Session Rehydration Utility v43.1
 * 
 * Handles session restoration from HttpOnly cookies via the session edge function.
 * Used by both App.tsx (initial load) and visibilityCoordinator.ts (tab revisits).
 * 
 * v43.1: Non-blocking realtime reconnect
 * - Handles cookie expiration gracefully
 * - Never blocks on non-critical operations
 * - Always returns boolean (never throws)
 */

import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Rehydrate session from server using HttpOnly cookie
 * @returns Promise<boolean> - true if session restored successfully
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const rehydrationStart = Date.now();
  console.log("%c🔄 v43.1 - REHYDRATING SESSION FROM SERVER...", "color: cyan; font-weight: bold; font-size: 14px;");
  
  try {
    // CRITICAL: Use the correct edge function URL
    const SESSION_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";
    const supabase = getSupabaseClient();

    console.log(`📡 v43.1 - Fetching session from: ${SESSION_FN}`);
    console.log(`🍪 v43.1 - Sending credentials: include`);

    const fetchStart = Date.now();
    const res = await fetch(SESSION_FN, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const fetchDuration = Date.now() - fetchStart;

    console.log(`📡 v43.1 - Session endpoint responded in ${fetchDuration}ms with status: ${res.status}`);

    if (!res.ok) {
      console.error(`❌ v43.1 - Session endpoint failed with status ${res.status}`);
      const errorText = await res.text().catch(() => 'Unable to read error');
      console.error(`❌ v43.1 - Error response:`, errorText);
      console.error(`💡 v43.1 - Check if edge function is deployed`);
      return false;
    }

    const parseStart = Date.now();
    const payload = await res.json();
    console.log(`📦 v43.1 - Parsed response in ${Date.now() - parseStart}ms`);
    console.log(`📦 v43.1 - Response payload keys:`, Object.keys(payload || {}));
    
    const session = payload?.session || payload?.data?.session || payload?.data || null;

    if (!session) {
      console.warn("⚠️ v43.1 - No session in response (cookie expired)");
      console.warn("💡 v43.1 - User will need to re-login");
      return false;
    }

    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v43.1 - Session missing tokens");
      console.warn("⚠️ v43.1 - Session keys:", Object.keys(session || {}));
      return false;
    }

    console.log(`✅ v43.1 - Valid session tokens received for user:`, session.user?.email);

    // Set session with proper error handling
    const setSessionStart = Date.now();
    const { error: setError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    console.log(`🔐 v43.1 - setSession completed in ${Date.now() - setSessionStart}ms`);

    if (setError) {
      console.error("❌ v43.1 - Failed to set session:", setError.message);
      return false;
    }

    // Non-blocking realtime reconnect
    try {
      supabase.realtime.connect();
      console.log("🔌 v43.1 - Realtime reconnect initiated");
    } catch (e) {
      console.warn("⚠️ v43.1 - Realtime reconnect failed (non-critical):", e);
    }

    // Small delay for auth state propagation
    await new Promise(resolve => setTimeout(resolve, 100));

    const totalDuration = Date.now() - rehydrationStart;
    console.log(`%c✅ SESSION RESTORED in ${totalDuration}ms`, "color: lime; font-size: 14px; font-weight: bold;");
    return true;
  } catch (err) {
    const totalDuration = Date.now() - rehydrationStart;
    console.error(`❌ v43.1 - Rehydrate failed after ${totalDuration}ms:`, err);
    console.error("❌ v43.1 - Error:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
