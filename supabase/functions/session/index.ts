import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getCorsHeaders(origin: string | null) {
  // CRITICAL: Exact origin matching for credentials
  const allowedOrigins = [
    'https://housinghub.app',
    'https://56a1a977-22a1-4e1e-83f7-9571291dc8ad.lovableproject.com',
    'https://preview--housinghub.lovable.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  // Return specific origin if allowed, otherwise use fallback
  const allowedOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : 'https://housinghub.app';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cookie',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 v58.0 Session validation called');
    console.log('🔍 v58.0 Origin:', origin);
    console.log('🔍 v58.0 All headers:', Object.fromEntries(req.headers.entries()));
    
    // Extract session cookie
    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 v58.0 Raw cookie header:', cookieHeader?.substring(0, 100) + '...');
    
    if (!cookieHeader) {
      console.log('❌ v58.0 No cookie header found in request');
      return new Response(
        JSON.stringify({ session: null, reason: 'no_cookie_header' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse cookie - handle both formats
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    console.log('🍪 v58.0 Parsed cookie keys:', Object.keys(cookies));
    
    const sessionCookie = cookies['sb-auth-session'];
    
    if (!sessionCookie) {
      console.log('❌ v58.0 sb-auth-session cookie not found in:', Object.keys(cookies));
      return new Response(
        JSON.stringify({ session: null, reason: 'no_session_cookie' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🍪 v58.0 Session cookie found, length:', sessionCookie.length);

    // Decode session data with better error handling
    let sessionData;
    try {
      sessionData = JSON.parse(atob(sessionCookie));
      console.log('🔍 v58.0 Session data decoded successfully:', {
        hasAccessToken: !!sessionData.access_token,
        hasRefreshToken: !!sessionData.refresh_token,
        userId: sessionData.user?.id,
        tokenLength: sessionData.access_token?.length,
        expiresAt: sessionData.expires_at
      });
    } catch (decodeError) {
      console.error('❌ v58.0 Failed to decode session cookie:', decodeError);
      return new Response(
        JSON.stringify({ session: null, reason: 'invalid_cookie_format' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Set-Cookie': 'sb-auth-session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0',
          },
        }
      );
    }

    if (!sessionData.access_token || !sessionData.refresh_token) {
      console.error('❌ v58.0 Session data missing tokens');
      return new Response(
        JSON.stringify({ session: null, reason: 'missing_tokens' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Set-Cookie': 'sb-auth-session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0',
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 v58.0 Validating session with Supabase...');
    
    // Validate and potentially refresh the session
    const { data: { session }, error } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    });

    if (error || !session) {
      console.error('❌ v58.0 Session validation failed:', error?.message);
      console.error('❌ v58.0 Error details:', error);
      
      // Clear invalid cookie
      return new Response(
        JSON.stringify({ session: null, reason: 'validation_failed', error: error?.message }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Set-Cookie': 'sb-auth-session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0',
          },
        }
      );
    }

    console.log('✅ v58.0 Session validated successfully for user:', session.user.email);
    console.log('✅ v58.0 Session expires at:', session.expires_at);

    // Check if tokens were refreshed
    const tokensRefreshed = session.access_token !== sessionData.access_token;
    console.log('🔄 v58.0 Tokens refreshed:', tokensRefreshed);
    
    // If tokens were refreshed, update cookie
    if (tokensRefreshed) {
      console.log('🔄 v58.0 Updating cookie with refreshed tokens');
      
      const newSessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
        },
      };

      const cookieValue = btoa(JSON.stringify(newSessionData));
      const cookieHeader = `sb-auth-session=${cookieValue}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${60 * 60 * 24 * 30}`;

      return new Response(
        JSON.stringify({ session }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Set-Cookie': cookieHeader,
          },
        }
      );
    }

    // Return existing valid session
    return new Response(
      JSON.stringify({ session }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ v58.0 Session validation error:', error);
    console.error('❌ v58.0 Error stack:', error instanceof Error ? error.stack : 'No stack');
    return new Response(
      JSON.stringify({ 
        session: null,
        reason: 'server_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
