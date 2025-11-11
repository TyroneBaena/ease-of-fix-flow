import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== AUTH CALLBACK FUNCTION ===");
    
    const { access_token, refresh_token, type } = await req.json();
    
    if (!access_token || !refresh_token) {
      throw new Error('Missing required tokens');
    }

    console.log(`Processing ${type} callback with tokens`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate the tokens by setting the session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      console.error('Session validation error:', sessionError);
      throw new Error(`Invalid tokens: ${sessionError.message}`);
    }

    if (!sessionData.session || !sessionData.user) {
      throw new Error('No session data returned');
    }

    console.log(`✅ Session validated for user: ${sessionData.user.id}`);

    // Set HttpOnly cookies
    const cookieOptions = [
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      `Max-Age=${60 * 60 * 24 * 7}`, // 7 days
    ].join('; ');

    const headers = new Headers(corsHeaders);
    headers.set('Set-Cookie', `sb-access-token=${access_token}; ${cookieOptions}`);
    headers.append('Set-Cookie', `sb-refresh-token=${refresh_token}; ${cookieOptions}`);
    headers.set('Content-Type', 'application/json');

    console.log('✅ HttpOnly cookies set successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email,
          email_confirmed_at: sessionData.user.email_confirmed_at,
        },
        session: {
          access_token,
          refresh_token,
          expires_at: sessionData.session.expires_at,
        },
      }),
      { 
        status: 200,
        headers,
      }
    );

  } catch (error: any) {
    console.error('Auth callback error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Authentication failed',
      }),
      {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
