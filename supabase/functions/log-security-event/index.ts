import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 [Log Security Event] Starting security event logging...')

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body
    const { event_type, user_email, ip_address, user_agent, metadata } = await req.json()

    console.log('🔐 [Log Security Event] Logging event:', {
      event_type,
      user_email,
      user_agent: user_agent?.substring(0, 100), // Truncate for logging
      metadata
    })

    // Get client IP if not provided
    const clientIP = ip_address || req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'

    // Call the log_security_event function with service role privileges
    const { data, error } = await supabase.rpc('log_security_event', {
      p_event_type: event_type,
      p_user_id: null, // No user ID for failed logins
      p_user_email: user_email,
      p_ip_address: clientIP,
      p_user_agent: user_agent,
      p_session_id: null,
      p_metadata: metadata || {}
    })

    if (error) {
      console.error('❌ [Log Security Event] Database error:', error)
      throw error
    }

    console.log('✅ [Log Security Event] Successfully logged security event with ID:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: data,
        message: 'Security event logged successfully' 
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )

  } catch (error) {
    console.error('❌ [Log Security Event] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to log security event'
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