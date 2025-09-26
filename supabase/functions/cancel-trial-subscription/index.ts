import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[CANCEL-TRIAL-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting trial subscription cancellation");

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      log("Authentication failed", { authError });
      throw new Error('User not authenticated');
    }

    log("User authenticated", { userId: user.id });

    // Parse request body for cancellation reason
    const body = await req.json();
    const cancellationReason = body.reason || 'No reason provided';

    log("Cancellation reason", { reason: cancellationReason });

    // Create admin client
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get subscriber data
    const { data: subscriber, error: subscriberError } = await adminSupabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriberError) {
      log("No existing subscriber found, creating cancelled record", { subscriberError });
      
      // Create a new subscriber record marked as cancelled
      const { data: newSubscriber, error: createError } = await adminSupabase
        .from('subscribers')
        .insert({
          user_id: user.id,
          email: user.email!,
          is_trial_active: false,
          is_cancelled: true,
          cancellation_date: new Date().toISOString(),
          subscribed: false,
          active_properties_count: 0,
        })
        .select()
        .single();

      if (createError) {
        log("Error creating subscriber", { createError });
        throw new Error('Failed to create subscriber record');
      }

      log("Created cancelled subscriber record", { subscriberId: newSubscriber.id });

      return new Response(JSON.stringify({
        success: true,
        message: 'Trial cancelled successfully',
        subscriber_id: newSubscriber.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    log("Found existing subscriber", { subscriberId: subscriber.id });

    // Update subscriber to mark as cancelled
    const { data: updatedSubscriber, error: updateError } = await adminSupabase
      .from('subscribers')
      .update({
        is_trial_active: false,
        is_cancelled: true,
        cancellation_date: new Date().toISOString(),
        subscribed: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id)
      .select()
      .single();

    if (updateError) {
      log("Error updating subscriber", { updateError });
      throw new Error('Failed to cancel subscription');
    }

    log("Successfully cancelled subscription", { subscriberId: updatedSubscriber.id });

    return new Response(JSON.stringify({
      success: true,
      message: 'Trial cancelled successfully',
      subscriber_id: updatedSubscriber.id,
      cancellation_date: updatedSubscriber.cancellation_date,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log("Error in cancel-trial-subscription", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});