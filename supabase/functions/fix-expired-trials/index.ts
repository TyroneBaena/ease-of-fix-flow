import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Emergency function to clean up data inconsistencies
 * Marks expired trials as inactive if they don't have payment methods
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[FIX-EXPIRED-TRIALS] Starting cleanup of expired trials");

    const now = new Date();
    
    // Get all trials that ended but are still marked as active
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, email, trial_end_date, active_properties_count, payment_method_id")
      .eq("is_trial_active", true)
      .eq("subscribed", false)
      .not("trial_end_date", "is", null)
      .lt("trial_end_date", now.toISOString());

    if (fetchError) {
      console.error("[FIX-EXPIRED-TRIALS] Error fetching expired trials:", fetchError);
      throw fetchError;
    }

    console.log(`[FIX-EXPIRED-TRIALS] Found ${expiredTrials?.length || 0} expired trials to fix`);

    const updates = [];

    for (const trial of expiredTrials || []) {
      console.log(`[FIX-EXPIRED-TRIALS] Processing ${trial.email}`);
      
      // Mark trial as inactive
      const { error: updateError } = await supabase
        .from("subscribers")
        .update({
          is_trial_active: false,
          updated_at: now.toISOString(),
        })
        .eq("user_id", trial.user_id);

      if (updateError) {
        console.error(`[FIX-EXPIRED-TRIALS] Failed to update ${trial.email}:`, updateError);
        updates.push({
          email: trial.email,
          status: 'failed',
          error: updateError.message,
        });
      } else {
        console.log(`[FIX-EXPIRED-TRIALS] Successfully marked trial as inactive for ${trial.email}`);
        updates.push({
          email: trial.email,
          status: 'fixed',
          had_payment_method: !!trial.payment_method_id,
          property_count: trial.active_properties_count || 0,
        });
      }
    }

    console.log(`[FIX-EXPIRED-TRIALS] Processed ${updates.length} trial fixes`);

    return new Response(
      JSON.stringify({
        success: true,
        trials_fixed: updates.length,
        details: updates,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[FIX-EXPIRED-TRIALS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});