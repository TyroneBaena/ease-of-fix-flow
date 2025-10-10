import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

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
    console.log('🔐 [SecurityEvent] Starting security event logging...');
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const body = await req.json();
    console.log('🔐 [SecurityEvent] Request body:', JSON.stringify(body, null, 2));
    
    const { event_type, user_email, ip_address, user_agent, metadata } = body;

    // Get client IP from headers if not provided
    const clientIP = ip_address || 
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      'unknown';

    console.log('🔐 [SecurityEvent] Extracted IP:', clientIP);

    // Get user_id from email to properly set organization_id
    let userId = null;
    if (user_email) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('email', user_email)
        .single();
      
      userId = profileData?.id || null;
      console.log('🔐 [SecurityEvent] Found user_id:', userId, 'for email:', user_email);
    }

    // Log the security event to database using the correct parameter names
    console.log('🔐 [SecurityEvent] About to insert event data:', {
      event_type,
      user_id: userId,
      user_email,
      ip_address: clientIP,
      user_agent,
      metadata: metadata || {}
    });

    const { data, error } = await supabase
      .rpc('log_security_event', {
        p_event_type: event_type,
        p_user_id: userId, // Now we pass the actual user_id
        p_user_email: user_email,
        p_ip_address: clientIP,
        p_user_agent: user_agent,
        p_session_id: null,
        p_metadata: metadata || {}
      });

    if (error) {
      console.error('🔐 [SecurityEvent] Database error:', error);
      throw error;
    }

    console.log('🔐 [SecurityEvent] Successfully logged event:', data);

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
        } 
      }
    );

  } catch (error) {
    console.error('🔐 [SecurityEvent] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Failed to log security event' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});