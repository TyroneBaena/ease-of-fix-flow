import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Test function to verify cron job execution and edge function connectivity
 * This helps diagnose why automated jobs aren't running
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const timestamp = new Date().toISOString();
    console.log(`[TEST-CRON] Execution test started at ${timestamp}`);

    // Test database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from("subscribers")
      .select("count")
      .limit(1);

    // Test all three automated edge functions
    const results = {
      timestamp,
      database_connection: dbError ? 'failed' : 'success',
      functions_tested: [],
    };

    // Test 1: Auto-convert trials
    try {
      console.log("[TEST-CRON] Testing auto-convert-trials function...");
      const autoConvertResponse = await fetch(`${supabaseUrl}/functions/v1/auto-convert-trials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ test: true, timestamp }),
      });

      results.functions_tested.push({
        name: 'auto-convert-trials',
        status: autoConvertResponse.ok ? 'reachable' : 'failed',
        http_status: autoConvertResponse.status,
      });
    } catch (error) {
      results.functions_tested.push({
        name: 'auto-convert-trials',
        status: 'error',
        error: error.message,
      });
    }

    // Test 2: Check trial reminders
    try {
      console.log("[TEST-CRON] Testing check-trial-reminders function...");
      const reminderResponse = await fetch(`${supabaseUrl}/functions/v1/check-trial-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ test: true, timestamp }),
      });

      results.functions_tested.push({
        name: 'check-trial-reminders',
        status: reminderResponse.ok ? 'reachable' : 'failed',
        http_status: reminderResponse.status,
      });
    } catch (error) {
      results.functions_tested.push({
        name: 'check-trial-reminders',
        status: 'error',
        error: error.message,
      });
    }

    // Test 3: Adjust subscription billing
    try {
      console.log("[TEST-CRON] Testing adjust-subscription-billing function...");
      const billingResponse = await fetch(`${supabaseUrl}/functions/v1/adjust-subscription-billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ test: true, timestamp }),
      });

      results.functions_tested.push({
        name: 'adjust-subscription-billing',
        status: billingResponse.ok ? 'reachable' : 'failed',
        http_status: billingResponse.status,
      });
    } catch (error) {
      results.functions_tested.push({
        name: 'adjust-subscription-billing',
        status: 'error',
        error: error.message,
      });
    }

    // Check cron job configuration
    const { data: cronJobs, error: cronError } = await supabase.rpc('analytics_query', {
      query: 'SELECT jobid, schedule, command, active FROM cron.job'
    });

    results.cron_configuration = cronError 
      ? { status: 'failed', error: cronError.message }
      : { status: 'success', jobs: cronJobs };

    console.log("[TEST-CRON] Test completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cron execution test completed",
        results,
        recommendations: [
          results.database_connection === 'failed' ? 'Database connection failed - check credentials' : null,
          results.functions_tested.some(f => f.status !== 'reachable') ? 'Some edge functions are not reachable - check function deployment' : null,
          'If all tests pass but cron jobs still dont run, check Supabase project settings for cron enablement',
        ].filter(Boolean),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[TEST-CRON] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});