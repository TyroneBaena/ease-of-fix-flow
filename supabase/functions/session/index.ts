import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getCorsHeaders(origin: string | null) {
  // CRITICAL: When using credentials, MUST return specific origin, NOT wildcard
  // Browsers reject Access-Control-Allow-Origin: * with credentials: true
  const allowedOrigin = origin || 'https://preview--housinghub.lovable.app';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('🔍 Session validation called');
    console.log('📋 Request headers:', req.headers.get('cookie') ? 'Cookie header present' : 'No cookie header');

    // Extract cookie from request
    const cookieHeader = req.headers.get('cookie');
    
    if (!cookieHeader) {
      console.log('No cookie found');
      return new Response(
        JSON.stringify({ session: null }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🍪 Cookie header found, parsing...');
    
    // Parse the session cookie
    const match = cookieHeader.match(/sb-auth-session=([^;]+)/);
    if (!match) {
      console.log('Session cookie not found in cookie header');
      console.log('Cookie header value:', cookieHeader.substring(0, 100));
      return new Response(
        JSON.stringify({ session: null }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Found sb-auth-session cookie, decoding...');
    let sessionData;
    try {
      sessionData = JSON.parse(atob(match[1]));
      console.log('✅ Session data decoded, user:', sessionData.user?.email);
    } catch (e) {
      console.error('Failed to parse session cookie:', e);
      return new Response(
        JSON.stringify({ session: null }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if tokens are still valid by attempting to refresh
    const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    });

    if (refreshError || !refreshData.session) {
      console.log('Session invalid or expired:', refreshError?.message);
      // Clear the invalid cookie
      const clearCookieHeader = 'sb-auth-session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0';
      return new Response(
        JSON.stringify({ session: null }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': clearCookieHeader,
          } 
        }
      );
    }

    console.log('✅ Session valid for user:', refreshData.user.email);

    // If token was refreshed, update the cookie
    let responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    
    if (refreshData.session.access_token !== sessionData.access_token) {
      console.log('🔄 Token refreshed, updating cookie');
      const newSessionData = {
        access_token: refreshData.session.access_token,
        refresh_token: refreshData.session.refresh_token,
        expires_at: refreshData.session.expires_at,
        user: {
          id: refreshData.user.id,
          email: refreshData.user.email,
          role: refreshData.user.role,
        },
      };
      const cookieValue = btoa(JSON.stringify(newSessionData));
      const cookieHeader = `sb-auth-session=${cookieValue}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
      responseHeaders = { ...responseHeaders, 'Set-Cookie': cookieHeader };
    }

    return new Response(
      JSON.stringify({
        session: {
          access_token: refreshData.session.access_token,
          refresh_token: refreshData.session.refresh_token,
          expires_at: refreshData.session.expires_at,
          user: refreshData.user,
        },
      }),
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  } catch (error) {
    console.error('Session validation error:', error);
    return new Response(
      JSON.stringify({ session: null, error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
