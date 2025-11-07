import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Session validation called');

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

    // Parse the session cookie
    const match = cookieHeader.match(/sb-auth-session=([^;]+)/);
    if (!match) {
      console.log('Session cookie not found');
      return new Response(
        JSON.stringify({ session: null }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let sessionData;
    try {
      sessionData = JSON.parse(atob(match[1]));
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
