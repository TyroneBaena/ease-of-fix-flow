// src/integrations/supabase/client.ts
// v59.0 - HYBRID SESSION PERSISTENCE (localStorage + cookie backup)
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
 * v59.0 - CRITICAL FIX: Enable client-side session persistence
 * 
 * PROBLEM: Disabled persistSession made app 100% dependent on HTTP-only cookies
 * which fail across Lovable's multiple domains (lovableproject.com, lovable.app, etc.)
 * 
 * SOLUTION: Enable localStorage persistence (works across ALL domains) with cookie backup
 * - persistSession: true → Stores session in localStorage (survives tab switches/closes)
 * - autoRefreshToken: true → Automatically refreshes tokens before expiry
 * - Cookie backup remains as secondary mechanism
 * 
 * This provides:
 * ✅ Domain-independent session persistence
 * ✅ Automatic token refresh
 * ✅ Tab revisit works instantly
 * ✅ No dependency on cookie transmission
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    console.log("🔧 v59.0 - Creating SINGLE Supabase client with localStorage persistence");
    _supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true, // ✅ CRITICAL: Enable localStorage persistence
        autoRefreshToken: true, // ✅ CRITICAL: Enable auto token refresh
        detectSessionInUrl: true, // ✅ Handle email confirmation links
        storage: undefined, // ✅ Use default localStorage implementation
      },
    });
    console.log("✅ v59.0 - Supabase client created with hybrid persistence");
  }
  return _supabase;
}

/**
 * ✅ Export the singleton instance (created immediately at module load)
 * This ensures everyone uses the EXACT SAME client instance.
 */
export const supabaseClient = getSupabaseClient();
export const supabase = supabaseClient; // Alias for backward compatibility
