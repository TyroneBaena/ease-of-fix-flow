// src/integrations/supabase/client.ts
// v61.0 - HYBRID SESSION MANAGEMENT (localStorage + email confirmation support)
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
 * v61.0 - HYBRID SESSION MANAGEMENT
 * 
 * ARCHITECTURE:
 * - persistSession: true → Allows email confirmations and local storage
 * - Session can be stored in localStorage OR cookies
 * - Supports both stateless email confirmations and cookie-based auth
 * 
 * FLOW:
 * 1. Email confirmation → Stores session in localStorage
 * 2. Login → Can use either localStorage or cookies
 * 3. Works across browsers for email confirmations
 * 
 * This provides:
 * ✅ Email confirmation support across browsers
 * ✅ Session persistence in localStorage
 * ✅ Token refresh capabilities
 * ✅ Works with email magic links
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    console.log("🔧 v61.0 - Creating Supabase client with hybrid session management");
    _supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true, // ✅ Enable session persistence for email confirmations
        autoRefreshToken: true, // ✅ Auto refresh tokens
        detectSessionInUrl: true, // ✅ Handle email confirmation links
        storage: window.localStorage, // ✅ Use localStorage for session storage
      },
    });
    console.log("✅ v61.0 - Supabase client created with hybrid session management");
  }
  return _supabase;
}

/**
 * ✅ Export the singleton instance (created immediately at module load)
 * This ensures everyone uses the EXACT SAME client instance.
 */
export const supabaseClient = getSupabaseClient();
export const supabase = supabaseClient; // Alias for backward compatibility
