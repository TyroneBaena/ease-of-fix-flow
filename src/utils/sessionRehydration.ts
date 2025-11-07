/**
 * Session Rehydration Utility v47.0
 * 
 * Robust session restoration from HttpOnly cookies with setSession timeout fix.
 * 
 * v47.0: Fixed hanging setSession() by adding timeout wrapper and retry logic
 * - Returns true if session restored successfully
 * - Returns false if cookie expired or endpoint failed
 * - Never throws exceptions
 * - Has 10s fetch timeout + 5s setSession timeout
 */

import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Wrap setSession with timeout to prevent infinite hangs
 */
async function setSessionWithTimeout(
  supabase: any,
  tokens: { access_token: string; refresh_token: string },
  timeoutMs: number = 5000
): Promise<{ error: any }> {
  return new Promise((resolve) => {
    let resolved = false;
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error("⏰ v47.0 - setSession timeout after 5s");
        resolve({ error: new Error("setSession timeout") });
      }
    }, timeoutMs);
    
    // Call setSession
    supabase.auth.setSession(tokens)
      .then((result: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve(result);
        }
      })
      .catch((err: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({ error: err });
        }
      });
  });
}

/**
 * Rehydrate session from server using HttpOnly cookie
 * @returns Promise<boolean> - true if session restored successfully
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const start = Date.now();
  console.log("%c🔄 v47.0 - RESTORING SESSION...", "color: cyan; font-weight: bold");
  
  try {
    const SESSION_FN = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";
    const supabase = getSupabaseClient();

    // v47.0: Add 10s timeout protection for fetch
    const controller = new AbortController();
    const fetchTimeoutId = setTimeout(() => controller.abort(), 10000);

    console.log("📡 v47.0 - Fetching session from server...");
    const res = await fetch(SESSION_FN, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    
    clearTimeout(fetchTimeoutId);

    if (!res.ok) {
      console.error(`❌ v47.0 - Session endpoint failed: ${res.status}`);
      return false;
    }

    const payload = await res.json();
    const session = payload?.session || payload?.data?.session || payload?.data || null;

    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v47.0 - No valid session (cookie expired or cleared)");
      return false;
    }

    console.log(`✅ v47.0 - Session received for: ${session.user?.email}`);

    // v47.0: Critical fix - wrap setSession with timeout to prevent hanging
    console.log("🔐 v47.0 - Setting session in Supabase client...");
    const { error } = await setSessionWithTimeout(supabase, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }, 5000); // 5s timeout for setSession

    if (error) {
      console.error("❌ v47.0 - Failed to set session:", error.message);
      
      // v47.0: Retry once if setSession times out
      if (error.message.includes("timeout")) {
        console.log("🔄 v47.0 - Retrying setSession...");
        const { error: retryError } = await setSessionWithTimeout(supabase, {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }, 5000);
        
        if (retryError) {
          console.error("❌ v47.0 - Retry failed:", retryError.message);
          return false;
        }
        console.log("✅ v47.0 - Retry succeeded");
      } else {
        return false;
      }
    }

    console.log("✅ v47.0 - Session set successfully");

    // Non-blocking realtime reconnect
    try {
      console.log("🔌 v47.0 - Reconnecting realtime...");
      supabase.realtime.connect();
    } catch (e) {
      console.warn("⚠️ v47.0 - Realtime reconnect failed (non-critical)");
    }

    // Wait for auth state to propagate
    console.log("⏳ v47.0 - Waiting for auth state propagation...");
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(`%c✅ SESSION RESTORED in ${Date.now() - start}ms`, "color: lime; font-weight: bold");
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error("❌ v47.0 - Session restoration timeout (10s)");
    } else {
      console.error(`❌ v47.0 - Session restoration error:`, err instanceof Error ? err.message : String(err));
    }
    return false;
  }
}
