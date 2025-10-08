import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Manual Trigger for All Cron Jobs
 * Workaround for Supabase pg_cron not executing reliably
 * This function can be called manually or via external schedulers (GitHub Actions, etc.)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job, test } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log(`[MANUAL-TRIGGER] Received request to trigger: ${job || "all jobs"}`);
    console.log(`[MANUAL-TRIGGER] Test mode: ${test || false}`);

    const results = [];
    const timestamp = new Date().toISOString();

    // Determine which jobs to trigger
    const jobsToRun = job === "all" || !job 
      ? ["auto-convert-trials", "adjust-subscription-billing", "check-trial-reminders"]
      : [job];

    for (const jobName of jobsToRun) {
      console.log(`[MANUAL-TRIGGER] Triggering ${jobName}...`);
      
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${jobName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ 
            source: 'manual-trigger',
            test: test || false,
            timestamp 
          }),
        });

        const responseData = await response.text();
        
        results.push({
          job: jobName,
          status: response.ok ? 'success' : 'failed',
          http_status: response.status,
          response: responseData,
          triggered_at: timestamp,
        });

        console.log(`[MANUAL-TRIGGER] ${jobName} completed with status ${response.status}`);
      } catch (error) {
        console.error(`[MANUAL-TRIGGER] Error triggering ${jobName}:`, error);
        results.push({
          job: jobName,
          status: 'error',
          error: error.message,
          triggered_at: timestamp,
        });
      }
    }

    const allSuccessful = results.every(r => r.status === 'success');

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        message: allSuccessful 
          ? `Successfully triggered ${results.length} job(s)` 
          : 'Some jobs failed to trigger',
        results,
        triggered_at: timestamp,
        note: 'This is a manual workaround for Supabase pg_cron reliability issues',
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: allSuccessful ? 200 : 207, // 207 = Multi-Status
      }
    );
  } catch (error: any) {
    console.error("[MANUAL-TRIGGER] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
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
