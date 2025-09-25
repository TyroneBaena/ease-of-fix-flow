import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CANCEL-TRIAL] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("No authenticated user or email missing");
    log("Authenticated user", { userId: user.id, email: user.email });

    const { reason } = await req.json();

    // Get subscriber data
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriberError) {
      throw new Error(`Subscriber not found: ${subscriberError.message}`);
    }

    log("Found subscriber", { 
      userId: user.id, 
      subscriptionTier: subscriber.subscription_tier,
      isTrialActive: subscriber.subscription_tier === 'trial'
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // If user has a Stripe customer ID, cancel any active subscriptions
    if (subscriber.stripe_customer_id) {
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: subscriber.stripe_customer_id,
        status: 'active',
        limit: 10
      });

      // Cancel all active subscriptions
      for (const subscription of existingSubscriptions.data) {
        await stripe.subscriptions.cancel(subscription.id);
        log("Cancelled Stripe subscription", { subscriptionId: subscription.id });
      }
    }

    // Update subscriber record to cancelled status
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        subscribed: false,
        subscription_tier: 'cancelled',
        is_cancelled: true,
        cancellation_date: new Date().toISOString(),
        cancellation_reason: reason || 'User requested cancellation',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update subscriber: ${updateError.message}`);
    }

    log("Subscription cancelled successfully", { 
      userId: user.id,
      reason: reason || 'User requested cancellation'
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription cancelled successfully',
      cancellation_date: new Date().toISOString(),
      access_until: subscriber.subscription_tier === 'trial' 
        ? subscriber.trial_end_date 
        : new Date().toISOString() // Immediate cancellation for paid
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});