
import { createClient } from '@supabase/supabase-js';

// These environment variables are automatically injected by the Lovable Supabase integration
// Make sure to allow for fallback values during development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if the environment variables are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anonymous Key is missing. Make sure you have connected your project to Supabase through the Lovable Supabase integration.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
