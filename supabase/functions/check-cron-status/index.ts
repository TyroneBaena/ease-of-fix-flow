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
    console.log('🔍 [Check Cron Status] Starting cron jobs status check...');

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Use analytics_query to access cron schema
    console.log('📊 [Check Cron Status] Querying cron.job table via analytics_query...');
    
    const { data: jobsData, error: jobsError } = await supabaseAdmin.rpc('analytics_query', {
      query: `
        SELECT 
          jobid,
          schedule,
          command,
          nodename,
          database,
          username,
          active,
          jobname
        FROM cron.job
        ORDER BY jobid;
      `
    });

    if (jobsError) {
      console.error('❌ [Check Cron Status] Error querying cron jobs:', jobsError);
      throw jobsError;
    }

    const cronJobs = Array.isArray(jobsData) ? jobsData : (jobsData ? [jobsData] : []);
    console.log(`✅ [Check Cron Status] Found ${cronJobs.length} cron jobs`);

    // Get recent job runs
    console.log('📊 [Check Cron Status] Querying recent job runs...');
    
    const { data: runsData, error: runsError } = await supabaseAdmin.rpc('analytics_query', {
      query: `
        SELECT 
          jobid,
          runid,
          database,
          username,
          status,
          return_message,
          start_time,
          end_time
        FROM cron.job_run_details
        ORDER BY start_time DESC
        LIMIT 10;
      `
    });

    const recentRuns = Array.isArray(runsData) ? runsData : (runsData ? [runsData] : []);
    
    if (runsError) {
      console.warn('⚠️ [Check Cron Status] Could not fetch recent runs:', runsError);
    } else {
      console.log(`✅ [Check Cron Status] Found ${recentRuns.length} recent job runs`);
    }

    // Return the cron jobs data
    return new Response(
      JSON.stringify({
        success: true,
        jobs: cronJobs,
        recent_runs: recentRuns,
        count: cronJobs.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ [Check Cron Status] Fatal error:', error);
    
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
