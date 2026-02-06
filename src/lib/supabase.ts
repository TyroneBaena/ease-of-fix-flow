// src/lib/supabase.ts
// ✅ Updated to use new Supabase client exports

import { supabaseClient } from "@/integrations/supabase/client";

export const supabase = supabaseClient; // keeps old name for compatibility
export * from "@/integrations/supabase/client"; // optional: re-export helpers
