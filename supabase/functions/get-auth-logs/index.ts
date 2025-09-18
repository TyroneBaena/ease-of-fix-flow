import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { hours = 48 } = await req.json().catch(() => ({}))
    
    // Calculate the start time for fetching logs
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hours)
    
    console.log('Fetching auth logs from:', startTime.toISOString())

    try {
      // Try to use analytics query if available
      console.log('Executing analytics query...')
      const analyticsQuery = `
        select id, auth_logs.timestamp, event_message, metadata.level, metadata.status, metadata.path, metadata.msg as msg, metadata.error from auth_logs
          cross join unnest(metadata) as metadata
        where auth_logs.timestamp >= '${startTime.toISOString()}'::timestamptz
        order by timestamp desc
        limit 100
      `
      
      const { data: analyticsLogs, error: rpcError } = await supabase.rpc('analytics_query', {
        query: analyticsQuery
      })

      if (!rpcError && analyticsLogs && Array.isArray(analyticsLogs)) {
        console.log('Retrieved auth logs from analytics:', analyticsLogs.length)
        return new Response(
          JSON.stringify({ 
            data: analyticsLogs, 
            success: true,
            source: 'analytics_rpc'
          }),
          {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          }
        )
      }
    } catch (rpcError) {
      console.log('RPC call failed:', rpcError)
    }
    
    // Fetch live auth logs directly using Supabase analytics API
    console.log('Fetching current auth logs at:', new Date().toISOString())
    
    try {
      // Try to get live auth logs using supabase-js analytics method
      const { data: liveAuthLogs, error: analyticsError } = await supabase.rpc('get_auth_logs', {
        start_time: startTime.toISOString(),
        limit: 100
      })

      if (!analyticsError && liveAuthLogs && Array.isArray(liveAuthLogs)) {
        console.log('Successfully retrieved live auth logs:', liveAuthLogs.length)
        return new Response(
          JSON.stringify({ 
            data: liveAuthLogs, 
            success: true,
            source: 'live_analytics'
          }),
          {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          }
        )
      } else {
        console.log('Analytics query failed, using real auth logs from context:', analyticsError)
      }
    } catch (analyticsErr) {
      console.log('Analytics query error:', analyticsErr)
    }

    // Try to use direct analytics query
    try {
      const { data: directLogs, error: directError } = await supabase
        .from('auth_logs')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100)

      if (!directError && directLogs && directLogs.length > 0) {
        console.log('Retrieved auth logs directly:', directLogs.length)
        return new Response(
          JSON.stringify({ 
            data: directLogs, 
            success: true,
            source: 'direct_query'
          }),
          {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
          }
        )
      }
    } catch (directErr) {
      console.log('Direct query failed:', directErr)
    }

    // Return empty array if no logs available rather than hardcoded data
    console.log('No auth logs available from any source')
    
    return new Response(
      JSON.stringify({ 
        data: [], 
        success: true,
        source: 'empty_fallback',
        message: 'No auth logs available for the specified time range'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )
  } catch (error) {
    console.error('Error fetching auth logs:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        data: []
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500,
      }
    )
  }
})