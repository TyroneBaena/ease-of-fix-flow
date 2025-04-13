
import { createClient } from '@supabase/supabase-js';

// Use the client from the integrations folder which has the correct URL and key
import { supabase as configuredSupabase } from '@/integrations/supabase/client';

// Export the configured client
export const supabase = configuredSupabase;

// This function can be used to check if Supabase is properly initialized
export const isSupabaseConfigured = () => {
  try {
    return !!supabase?.auth;
  } catch (error) {
    console.error("Error checking Supabase configuration:", error);
    return false;
  }
};
