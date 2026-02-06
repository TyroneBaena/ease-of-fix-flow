// src/integrations/supabase/client.ts
// v60.0 - COOKIE-BASED SESSION PERSISTENCE (HttpOnly cookies)
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ✅ Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ❌ Safety check
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase environment variables are missing! Please check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
  );
}

// 🔒 SINGLE INSTANCE - created once at module load
let _supabase: SupabaseClient<Database> | null = null;

/**
 * v60.0 - REVERTED TO COOKIE-BASED SESSION MANAGEMENT
 * 
 * ARCHITECTURE:
 * - persistSession: false → Disables localStorage/sessionStorage
 * - Session stored in secure HttpOnly cookies via edge functions
 * - Session restored from /session endpoint on tab revisit
 * - Keeps Supabase client stateless for security
 * 
 * FLOW:
 * 1. Login → Edge function sets HttpOnly cookie
 * 2. Tab revisit → Fetch from /session endpoint
 * 3. Edge function validates cookie and returns session
 * 4. Client calls setSession() to restore state
 * 
 * This provides:
 * ✅ Secure HttpOnly cookie storage
 * ✅ Server-side session validation
 * ✅ No client-side token exposure
 * ✅ Works across all domains with proper CORS
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // ✅ CRITICAL: Disable localStorage - use cookies instead
        autoRefreshToken: true, // ✅ Auto refresh tokens
        detectSessionInUrl: true, // ✅ Handle email confirmation links
      },
    });
  }
  return _supabase;
}

/**
 * ✅ Export the singleton instance (created immediately at module load)
 * This ensures everyone uses the EXACT SAME client instance.
 */
export const supabaseClient = getSupabaseClient();
export const supabase = supabaseClient; // Alias for backward compatibility
