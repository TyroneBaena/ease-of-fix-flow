/**
 * Session Rehydration Utility
 * 
 * Handles session restoration from HttpOnly cookies via the session edge function.
 * Used by both App.tsx (initial load) and visibilityCoordinator.ts (tab revisits).
 * 
 * v41.0: Standalone utility to avoid circular dependencies
 */

import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Rehydrate session from server using HttpOnly cookie
 * @returns Promise<boolean> - true if session restored successfully
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const rehydrationStart = Date.now();
  console.log("%c🔄 v41.2 - REHYDRATING SESSION FROM SERVER...", "color: cyan; font-weight: bold; font-size: 14px;");
  
  try {
    // CRITICAL: Use the correct edge function URL (not the v1 path)
    const SESSION_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";
    const supabase = getSupabaseClient();

    console.log(`📡 v41.2 - Fetching session from: ${SESSION_FN}`);
    console.log(`🍪 v41.2 - Sending credentials: include`);

    const fetchStart = Date.now();
    const res = await fetch(SESSION_FN, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const fetchDuration = Date.now() - fetchStart;

    console.log(`📡 v41.2 - Session endpoint responded in ${fetchDuration}ms with status: ${res.status}`);

    if (!res.ok) {
      console.error(`❌ v41.2 - Session endpoint failed with status ${res.status}`);
      const errorText = await res.text().catch(() => 'Unable to read error');
      console.error(`❌ v41.2 - Error response:`, errorText);
      return false;
    }

    const parseStart = Date.now();
    const payload = await res.json();
    console.log(`📦 v41.2 - Parsed response in ${Date.now() - parseStart}ms`);
    
    const session = payload?.session || payload?.data?.session || payload?.data || null;

    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v41.2 - No valid session tokens in server response");
      console.warn("⚠️ v41.2 - Payload structure:", Object.keys(payload || {}));
      return false;
    }

    console.log(`✅ v41.2 - Valid session tokens received for user:`, session.user?.email);

    // CRITICAL: Set session with proper error handling
    const setSessionStart = Date.now();
    const { error: setError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    console.log(`🔐 v41.2 - setSession completed in ${Date.now() - setSessionStart}ms`);

    if (setError) {
      console.error("❌ v41.2 - Failed to set session on client:", setError);
      console.error("❌ v41.2 - Error name:", setError.name);
      console.error("❌ v41.2 - Error message:", setError.message);
      return false;
    }

    // Force realtime reconnect
    try {
      await supabase.realtime.connect();
      console.log("🔌 v41.2 - Realtime reconnected");
    } catch (e) {
      console.warn("⚠️ v41.2 - Realtime reconnect failed (non-critical):", e);
    }

    // Wait for auth state change to propagate
    await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 500ms to 100ms

    const totalDuration = Date.now() - rehydrationStart;
    console.log(`%c✅ SESSION RESTORED SUCCESSFULLY in ${totalDuration}ms`, "color: lime; font-size: 16px; font-weight: bold;");
    return true;
  } catch (err) {
    const totalDuration = Date.now() - rehydrationStart;
    console.error(`❌ v41.2 - Rehydrate failed after ${totalDuration}ms:`, err);
    console.error("❌ v41.2 - Error details:", {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
    return false;
  }
}
