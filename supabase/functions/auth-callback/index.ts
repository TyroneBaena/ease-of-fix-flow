// supabase/functions/auth-callback/index.ts
// Handles email confirmation callbacks and stores session in secure HttpOnly cookies

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    'https://housinghub.app',
    'https://www.housinghub.app',
    /^https:\/\/preview--housinghub\.lovable\.app$/,
    /^https:\/\/preview-[a-z0-9]+-housinghub\.lovable\.app$/,
    'http://localhost:5173',
    'http://localhost:8080'
  ];

  const isAllowed = origin && allowedOrigins.some(allowed => 
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : 'https://housinghub.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log('🔐 auth-callback: Processing email confirmation');

    // Parse request body
    const { access_token, refresh_token } = await req.json();

    if (!access_token || !refresh_token) {
      console.error('❌ auth-callback: Missing tokens');
      return new Response(
        JSON.stringify({ error: 'Missing access_token or refresh_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ auth-callback: Tokens received');

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Validate tokens by setting session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError || !sessionData.session) {
      console.error('❌ auth-callback: Invalid tokens:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired tokens', details: sessionError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ auth-callback: Session validated for user:', sessionData.user?.id);

    // Create secure cookie with session data
    const sessionCookie = btoa(JSON.stringify({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
      expires_in: sessionData.session.expires_in,
      user: sessionData.session.user,
    }));

    const cookieMaxAge = 7 * 24 * 60 * 60; // 7 days
    const cookieOptions = [
      `sb-auth-session=${sessionCookie}`,
      'Path=/',
      `Max-Age=${cookieMaxAge}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
    ].join('; ');

    console.log('✅ auth-callback: Cookie created, sending response');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: sessionData.user?.id,
          email: sessionData.user?.email,
          email_confirmed_at: sessionData.user?.email_confirmed_at,
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Set-Cookie': cookieOptions,
        },
      }
    );

  } catch (error: any) {
    console.error('❌ auth-callback: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
