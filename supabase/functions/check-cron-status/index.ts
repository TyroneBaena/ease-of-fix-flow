import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [Check Cron Status] Fetching expected cron job configurations...');

    // Since we can't directly query cron.job table from edge functions,
    // we'll return information about what cron jobs SHOULD be configured
    // based on the Phase 2 implementation requirements
    
    const expectedCronJobs = [
      {
        jobname: 'auto-convert-trials-daily',
        schedule: '0 2 * * *',
        command: 'SELECT net.http_post(...) -- Calls auto-convert-trials edge function',
        description: 'Runs daily at 2:00 AM to convert expired trials to paid subscriptions',
        status: 'expected',
        frequency: 'Daily at 2:00 AM',
        active: true
      },
      {
        jobname: 'adjust-billing-monthly',
        schedule: '0 3 1 * *',
        command: 'SELECT net.http_post(...) -- Calls adjust-subscription-billing edge function',
        description: 'Runs monthly on the 1st at 3:00 AM to adjust subscription amounts based on property counts',
        status: 'expected',
        frequency: 'Monthly on the 1st at 3:00 AM',
        active: true
      },
      {
        jobname: 'trial-reminders-daily',
        schedule: '0 9 * * *',
        command: 'SELECT net.http_post(...) -- Calls check-trial-reminders edge function',
        description: 'Runs daily at 9:00 AM to send trial reminder emails (7, 3, and 1 day before expiry)',
        status: 'expected',
        frequency: 'Daily at 9:00 AM',
        active: true
      }
    ];

    console.log(`✅ [Check Cron Status] Returning ${expectedCronJobs.length} expected cron job configurations`);

    // Return the expected cron jobs configuration
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expected cron jobs configuration (actual jobs should be configured in Supabase SQL Editor)',
        jobs: expectedCronJobs,
        count: expectedCronJobs.length,
        note: 'These are the expected cron jobs. To verify they are actually configured, check the Supabase SQL Editor cron.job table or use: SELECT * FROM cron.job;'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ [Check Cron Status] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        jobs: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
