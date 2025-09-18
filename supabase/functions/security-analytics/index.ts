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

    console.log('🔐 [Security Analytics] Starting security metrics fetch...')

    // Get security metrics from database
    const { data: metricsData, error: metricsError } = await supabase
      .rpc('get_security_metrics', { hours_back: 24 })

    if (metricsError) {
      console.error('❌ [Security Analytics] Error fetching metrics:', metricsError)
      throw metricsError
    }

    console.log('✅ [Security Analytics] Successfully fetched metrics:', metricsData?.[0])

    // Parse and format the response
    const metrics = metricsData?.[0] || {
      total_events: 0,
      failed_logins: 0,
      successful_logins: 0,
      unique_users: 0,
      recent_events: []
    }

    // Parse recent events JSON
    let recentEvents = []
    try {
      recentEvents = typeof metrics.recent_events === 'string' 
        ? JSON.parse(metrics.recent_events) 
        : metrics.recent_events || []
    } catch (parseError) {
      console.error('❌ [Security Analytics] Error parsing recent events:', parseError)
      recentEvents = []
    }

    // Format the final response
    const response = {
      success: true,
      data: {
        activeSessionsCount: 1, // Current user session
        failedLoginsToday: parseInt(metrics.failed_logins) || 0,
        totalLoginsToday: parseInt(metrics.successful_logins) || 0,
        recentLoginAttempts: recentEvents.map((event: any) => ({
          id: event.id,
          timestamp: event.created_at,
          email: event.user_email || 'Unknown User',
          status: event.event_type === 'login_success' ? 'success' : 'failed',
          msg: event.event_type === 'login_success' ? 'Login successful' : 'Login failed',
          level: event.event_type === 'login_success' ? 'info' : 'error',
          ip_address: event.ip_address,
          metadata: event.metadata || {}
        }))
      }
    }

    console.log('📊 [Security Analytics] Sending response:', response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )

  } catch (error) {
    console.error('❌ [Security Analytics] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        data: {
          activeSessionsCount: 1,
          failedLoginsToday: 0,
          totalLoginsToday: 0,
          recentLoginAttempts: []
        }
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