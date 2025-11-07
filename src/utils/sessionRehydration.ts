/**
 * Session Rehydration Utility v44.0
 * 
 * Simple session restoration from HttpOnly cookies.
 * 
 * v44.0: Simplified - just fetch and restore, no timeout wrapper
 * - Returns true if session restored successfully
 * - Returns false if cookie expired or endpoint failed
 * - Never throws exceptions
 */

import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Rehydrate session from server using HttpOnly cookie
 * @returns Promise<boolean> - true if session restored successfully
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const start = Date.now();
  console.log("%c🔄 v44.0 - RESTORING SESSION...", "color: cyan; font-weight: bold");
  
  try {
    const SESSION_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";
    const supabase = getSupabaseClient();

    const res = await fetch(SESSION_FN, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`❌ v44.0 - Session endpoint failed: ${res.status}`);
      return false;
    }

    const payload = await res.json();
    const session = payload?.session || payload?.data?.session || payload?.data || null;

    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v44.0 - No valid session (cookie expired)");
      return false;
    }

    console.log(`✅ v44.0 - Session received for: ${session.user?.email}`);

    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error("❌ v44.0 - Failed to set session:", error.message);
      return false;
    }

    // Non-blocking realtime reconnect
    try {
      supabase.realtime.connect();
    } catch (e) {
      console.warn("⚠️ v44.0 - Realtime reconnect failed (non-critical)");
    }

    // Wait for auth state to propagate
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(`%c✅ SESSION RESTORED in ${Date.now() - start}ms`, "color: lime; font-weight: bold");
    return true;
  } catch (err) {
    console.error(`❌ v44.0 - Session restoration error:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}
