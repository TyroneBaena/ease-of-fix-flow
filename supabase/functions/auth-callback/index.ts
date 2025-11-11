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
    // Use APPLICATION_URL environment variable to control where emails redirect
    // For testing: set to preview URL
    // For production: set to production URL or leave unset (defaults to housinghub.app)
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
    
    console.log('Using application URL:', applicationUrl);
    
    let finalRedirectUrl: string;
    
    if (redirectTo) {
      // Use the provided redirect URL
      finalRedirectUrl = redirectTo;
    } else if (type === 'recovery') {
      finalRedirectUrl = `${applicationUrl}/setup-password`;
    } else {
      finalRedirectUrl = `${applicationUrl}/email-confirm`;
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
