import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service key for analytics access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request parameters
    const { hours = 48 } = await req.json()
    
    // Calculate start time
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    console.log('Fetching auth logs from:', startTime)

    // Query auth logs using analytics API
    const query = `
      select id, auth_logs.timestamp, event_message, metadata.level, metadata.msg, metadata.error
      from auth_logs
        cross join unnest(metadata) as metadata
      where timestamp >= '${startTime}'
      order by timestamp desc
      limit 100
    `

    const { data: authLogs, error } = await supabase.rpc('query_analytics', {
      query: query
    })

    if (error) {
      console.error('Analytics query error:', error)
      throw error
    }

    console.log('Retrieved auth logs:', authLogs?.length || 0)

    return new Response(
      JSON.stringify({ 
        data: authLogs || [], 
        success: true 
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )
  }
})