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

    // Query cron.job table to get scheduled jobs
    const { data: cronJobs, error: cronError } = await supabaseAdmin
      .from('cron.job')
      .select('*')
      .order('jobname');

    if (cronError) {
      console.error('❌ [Check Cron Status] Error querying cron jobs:', cronError);
      throw cronError;
    }

    console.log(`✅ [Check Cron Status] Found ${cronJobs?.length || 0} cron jobs`);

    // Return the cron jobs data
    return new Response(
      JSON.stringify({
        success: true,
        jobs: cronJobs || [],
        count: cronJobs?.length || 0
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
