import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CANCEL-TRIAL] Starting cancellation process');
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[CANCEL-TRIAL] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[CANCEL-TRIAL] Authenticated user -', { userId: user.id, email: user.email });
    
    // Get request body
    const { reason } = await req.json();
    console.log('[CANCEL-TRIAL] Cancellation reason:', reason);
    
    // Find subscriber record using maybeSingle to avoid coercion error
    const { data: subscriber, error: fetchError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('[CANCEL-TRIAL] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!subscriber) {
      console.log('[CANCEL-TRIAL] No subscriber found, creating cancelled record');
      
      // Create a cancelled subscriber record
      const { error: insertError } = await supabase
        .from('subscribers')
        .insert({
          user_id: user.id,
          email: user.email,
          subscribed: false,
          is_trial_active: false,
          is_cancelled: true,
          cancellation_date: new Date().toISOString(),
          active_properties_count: 0
        });
      
      if (insertError) {
        console.error('[CANCEL-TRIAL] Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create cancellation record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[CANCEL-TRIAL] Created cancelled subscriber record');
      
      return new Response(
        JSON.stringify({ 
          message: 'Subscription cancelled successfully',
          was_subscribed: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update existing subscriber record
    const updateData: any = {
      subscribed: false,
      is_trial_active: false,
      is_cancelled: true,
      cancellation_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // If it was a trial, also end the trial
    if (subscriber.is_trial_active) {
      updateData.trial_end_date = new Date().toISOString();
    }
    
    const { error: updateError } = await supabase
      .from('subscribers')
      .update(updateData)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('[CANCEL-TRIAL] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to cancel subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[CANCEL-TRIAL] Successfully cancelled subscription');
    
    return new Response(
      JSON.stringify({ 
        message: 'Subscription cancelled successfully',
        was_trial: subscriber.is_trial_active,
        was_subscribed: subscriber.subscribed
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[CANCEL-TRIAL] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});