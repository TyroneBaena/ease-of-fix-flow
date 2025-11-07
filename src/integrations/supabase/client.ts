// src/integrations/supabase/client.ts
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
 * CRITICAL: Get the singleton Supabase client.
 * Always returns the SAME instance to prevent multiple goTrueClient instances.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    console.log("🔧 Creating SINGLE Supabase client instance");
    _supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // ✅ disables localStorage (we use cookies)
        autoRefreshToken: false, // ✅ backend handles refresh
        storage: {
          getItem: async () => null,
          setItem: async () => {},
          removeItem: async () => {},
        },
      },
    });
    console.log("✅ Supabase client created");
  }
  return _supabase;
}

/**
 * ✅ Export the singleton instance (created immediately at module load)
 * This ensures everyone uses the EXACT SAME client instance.
 */
export const supabaseClient = getSupabaseClient();
export const supabase = supabaseClient; // Alias for backward compatibility
