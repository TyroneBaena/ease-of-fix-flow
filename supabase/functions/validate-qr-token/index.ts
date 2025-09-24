import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    
    if (!token) {
      console.error('No token provided');
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Validating QR token:', token);

    // Create Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate the property access token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('validate_property_access_token', { p_token: token });

    if (tokenError) {
      console.error('Token validation error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate token' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!tokenData || tokenData.length === 0 || !tokenData[0].is_valid) {
      console.log('Invalid or expired token:', token);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const validToken = tokenData[0];
    console.log('Valid token data:', validToken);

    // Generate a temporary session token
    const sessionToken = crypto.randomUUID();
    
    // Create temporary session (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: sessionData, error: sessionError } = await supabase
      .from('temporary_sessions')
      .insert({
        session_token: sessionToken,
        property_id: validToken.property_id,
        organization_id: validToken.organization_id,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create temporary session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Created temporary session:', sessionData.id);

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: sessionToken,
        propertyId: validToken.property_id,
        propertyName: validToken.property_name,
        organizationId: validToken.organization_id,
        expiresAt: expiresAt.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});