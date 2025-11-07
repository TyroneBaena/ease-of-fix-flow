/**
 * Session Rehydration Utility v46.0
 * 
 * Robust session restoration from HttpOnly cookies.
 * 
 * v46.0: Added timeout protection and better error handling
 * - Returns true if session restored successfully
 * - Returns false if cookie expired or endpoint failed
 * - Never throws exceptions
 * - Has 10s timeout protection
 */

import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Rehydrate session from server using HttpOnly cookie
 * @returns Promise<boolean> - true if session restored successfully
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const start = Date.now();
  console.log("%c🔄 v46.0 - RESTORING SESSION...", "color: cyan; font-weight: bold");
  
  try {
    const SESSION_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";
    const supabase = getSupabaseClient();

    // v46.0: Add 10s timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(SESSION_FN, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`❌ v46.0 - Session endpoint failed: ${res.status}`);
      return false;
    }

    const payload = await res.json();
    const session = payload?.session || payload?.data?.session || payload?.data || null;

    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v46.0 - No valid session (cookie expired or cleared)");
      return false;
    }

    console.log(`✅ v46.0 - Session received for: ${session.user?.email}`);

    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error("❌ v46.0 - Failed to set session:", error.message);
      return false;
    }

    // Non-blocking realtime reconnect
    try {
      supabase.realtime.connect();
    } catch (e) {
      console.warn("⚠️ v46.0 - Realtime reconnect failed (non-critical)");
    }

    // Wait for auth state to propagate
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(`%c✅ SESSION RESTORED in ${Date.now() - start}ms`, "color: lime; font-weight: bold");
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error("❌ v46.0 - Session restoration timeout (10s)");
    } else {
      console.error(`❌ v46.0 - Session restoration error:`, err instanceof Error ? err.message : String(err));
    }
    return false;
  }
}
