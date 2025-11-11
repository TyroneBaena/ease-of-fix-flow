import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('🔐 Auth callback function called');
    console.log('Request URL:', req.url);
    
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type') || 'signup';
    const redirectTo = url.searchParams.get('redirect_to');
    
    console.log('Auth params:', { hasToken: !!token, type, redirectTo });

    if (!token) {
      console.error('Missing token in callback');
      return redirectWithError('Missing verification token', redirectTo);
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Verifying OTP token...');
    
    // Verify the token using verifyOtp - this returns a session automatically!
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'recovery' ? 'recovery' : 'signup'
    });

    if (verifyError || !verifyData.user || !verifyData.session) {
      console.error('OTP verification failed:', verifyError?.message);
      return redirectWithError(
        verifyError?.message || 'Invalid or expired verification link',
        redirectTo
      );
    }

    console.log('✅ Token verified successfully for user:', verifyData.user.id);
    console.log('User email confirmed:', verifyData.user.email_confirmed_at);
    console.log('✅ Session created by verifyOtp');

    // Determine redirect URL
    // IMPORTANT: For email confirmations to work across browsers, 
    // always redirect to production URL, never to preview URLs that require Lovable auth
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
    
    // Override preview URLs to production for cross-browser compatibility
    let finalRedirectUrl: string;
    const isPreviewUrl = redirectTo?.includes('lovable.app') || redirectTo?.includes('lovableproject.com');
    
    if (isPreviewUrl || !redirectTo) {
      // Use production URL for email confirmations to avoid Lovable auth requirement
      const productionUrl = 'https://housinghub.app';
      if (type === 'recovery') {
        finalRedirectUrl = `${productionUrl}/setup-password`;
      } else {
        finalRedirectUrl = `${productionUrl}/email-confirm`;
      }
      console.log('Using production URL for cross-browser compatibility');
    } else {
      finalRedirectUrl = redirectTo;
    }

    // Add session tokens as hash parameters (client-side only, not sent to server)
    const redirectUrl = new URL(finalRedirectUrl);
    const hashParams = new URLSearchParams();
    hashParams.set('access_token', verifyData.session.access_token);
    hashParams.set('refresh_token', verifyData.session.refresh_token);
    hashParams.set('expires_at', verifyData.session.expires_at?.toString() || '');
    hashParams.set('type', type);
    
    redirectUrl.hash = hashParams.toString();

    console.log('Redirecting to:', redirectUrl.toString().replace(/token=[^&]*/g, 'token=***'));

    // Redirect with tokens in hash
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl.toString(),
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error('Auth callback error:', error);
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
    return redirectWithError(
      error.message || 'Authentication failed',
      `${applicationUrl}/email-confirm`
    );
  }
});

function redirectWithError(errorMessage: string, redirectTo?: string | null): Response {
  const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
  const redirectUrl = new URL(redirectTo || `${applicationUrl}/email-confirm`);
  
  const hashParams = new URLSearchParams();
  hashParams.set('error', 'verification_failed');
  hashParams.set('error_description', errorMessage);
  
  redirectUrl.hash = hashParams.toString();
  
  console.log('Redirecting with error to:', redirectUrl.toString());
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl.toString(),
      ...corsHeaders
    }
  });
}
