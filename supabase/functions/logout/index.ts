function getCorsHeaders(origin: string | null) {
  // Support production domains, preview domains, and local development
  const allowedOrigins = [
    'https://housinghub.app',
    'https://www.housinghub.app',
    /^https:\/\/preview--housinghub\.lovable\.app$/,
    /^https:\/\/preview-[a-z0-9]+-housinghub\.lovable\.app$/,
    /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
    'http://localhost:5173',
    'http://localhost:3000',
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
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔓 Logout function called');

    // Clear the HttpOnly cookie
    const cookieHeader = 'sb-auth-session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0';

    console.log('🍪 Clearing HttpOnly cookie');

    return new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
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
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
