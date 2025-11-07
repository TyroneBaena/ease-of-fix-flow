/**
 * Session Rehydration Utility v48.0 - Clean & Simple
 * 
 * Simple, reliable session restoration with no retries or complex timeouts.
 * 
 * APPROACH:
 * 1. Fetch session from backend (/session endpoint with cookies)
 * 2. Create fresh Supabase client
 * 3. Set session using setSession()
 * 4. Wait briefly for propagation
 * 5. Return success/failure
 * 
 * Returns true if restored, false if failed (expired cookie, network error, etc.)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = "https://ltjlswzrdgtoddyqmydo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NDA5OTIsImV4cCI6MjA2MDExNjk5Mn0.YXg-x4oflJUdoRdQQQGI2NisUqUVHAXkhgyrr-4CoE0";
const SESSION_ENDPOINT = "https://ltjlswzrdgtoddyqmydo.functions.supabase.co/session";

/**
 * Restore session from backend cookie
 * Creates a fresh Supabase client to avoid stale state
 */
export async function rehydrateSessionFromServer(): Promise<boolean> {
  const startTime = Date.now();
  console.log("%c🔄 v48.0 - Starting session restoration", "color: cyan; font-weight: bold");

  try {
    // STEP 1: Fetch session from backend
    console.log("📡 v48.0 - Fetching session from backend...");
    const response = await fetch(SESSION_ENDPOINT, {
      method: "GET",
      credentials: "include", // Send HttpOnly cookies
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.error(`❌ v48.0 - Session endpoint returned ${response.status}`);
      return false;
    }

    const data = await response.json();
    const session = data?.session || data?.data?.session || data?.data;

    // STEP 2: Validate session
    if (!session?.access_token || !session?.refresh_token) {
      console.warn("⚠️ v48.0 - No valid session (cookie expired or missing)");
      return false;
    }

    console.log(`✅ v48.0 - Session received for user: ${session.user?.email}`);

    // STEP 3: Create fresh Supabase client
    console.log("🔧 v48.0 - Creating fresh Supabase client...");
    const freshClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: {
          getItem: async () => null,
          setItem: async () => {},
          removeItem: async () => {},
        },
      },
    });

    // STEP 4: Set session on fresh client
    console.log("🔐 v48.0 - Setting session on fresh client...");
    const { error } = await freshClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error("❌ v48.0 - Failed to set session:", error.message);
      return false;
    }

    console.log("✅ v48.0 - Session set successfully");

    // STEP 5: Reconnect realtime (non-blocking)
    try {
      console.log("🔌 v48.0 - Reconnecting realtime...");
      freshClient.realtime.connect();
    } catch (e) {
      console.warn("⚠️ v48.0 - Realtime reconnect failed (non-critical)");
    }

    // STEP 6: Brief wait for auth state propagation
    console.log("⏳ v48.0 - Waiting for session propagation...");
    await new Promise(resolve => setTimeout(resolve, 300));

    const duration = Date.now() - startTime;
    console.log(`%c✅ v48.0 - Session restored in ${duration}ms`, "color: lime; font-weight: bold");
    return true;

  } catch (error) {
    console.error("❌ v48.0 - Session restoration failed:", error);
    return false;
  }
}
