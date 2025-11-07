import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getCorsHeaders(origin: string | null) {
  // CRITICAL: Exact origin matching for credentials
  const allowedOrigins = [
    'https://56a1a977-22a1-4e1e-83f7-9571291dc8ad.lovableproject.com',
    'https://preview--housinghub.lovable.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ];
  
  // Return specific origin if allowed, otherwise use fallback
  const allowedOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : 'https://preview--housinghub.lovable.app';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Login function called');

    const { email, password } = await req.json();

    if (!email || !password) {
      console.error('Missing credentials');
      return new Response(
        JSON.stringify({ error: 'Email and password required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.session) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: authError?.message || 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated:', authData.user.email);

    // Create HttpOnly cookie with session tokens
    const sessionData = {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.role,
      },
    };

    const cookieValue = btoa(JSON.stringify(sessionData));
    const cookieHeader = `sb-auth-session=${cookieValue}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}`;

    console.log('🍪 Setting HttpOnly cookie');

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
          user: authData.user,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
