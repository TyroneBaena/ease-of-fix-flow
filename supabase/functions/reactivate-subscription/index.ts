import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[REACTIVATE-SUBSCRIPTION] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
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

    // Get subscriber data
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriberError) {
      throw new Error(`Subscriber not found: ${subscriberError.message}`);
    }

    if (!subscriber.is_cancelled) {
      throw new Error("Subscription is not cancelled");
    }

    log("Found cancelled subscriber", { 
      userId: user.id, 
      propertyCount: subscriber.active_properties_count,
      cancellationDate: subscriber.cancellation_date
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const propertyCount = subscriber.active_properties_count || 0;

    if (propertyCount === 0) {
      // No properties, just reactivate as trial
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30); // New 30-day trial

      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          subscribed: false, // Still in trial
          subscription_tier: 'trial',
          is_cancelled: false,
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          cancellation_date: null,
          cancellation_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Failed to reactivate trial: ${updateError.message}`);
      }

      log("Reactivated as trial", { userId: user.id, trialEndDate });

      return new Response(JSON.stringify({
        success: true,
        status: 'trial',
        trial_end_date: trialEndDate.toISOString(),
        property_count: propertyCount,
        message: 'Reactivated with new 30-day trial'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Has properties, need to create paid subscription
    const monthlyAmount = propertyCount * 29 * 100; // $29 per property in cents

    if (!subscriber.stripe_customer_id) {
      throw new Error("No Stripe customer ID found");
    }

    // Create new subscription
    const newSubscription = await stripe.subscriptions.create({
      customer: subscriber.stripe_customer_id,
      items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Property Management - ${propertyCount} properties`
          },
          unit_amount: monthlyAmount,
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }],
      collection_method: 'charge_automatically',
      metadata: {
        property_count: propertyCount.toString(),
        supabase_user_id: user.id,
        reactivation: 'true'
      }
    });

    log("Created reactivation subscription", { 
      subscriptionId: newSubscription.id,
      amount: monthlyAmount / 100
    });

    // Update subscriber record
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        subscribed: true,
        subscription_tier: 'paid',
        is_cancelled: false,
        last_billing_date: new Date().toISOString(),
        next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString(),
        cancellation_date: null,
        cancellation_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update subscriber: ${updateError.message}`);
    }

    log("Subscription reactivated successfully", { 
      userId: user.id,
      subscriptionId: newSubscription.id
    });

    return new Response(JSON.stringify({
      success: true,
      status: 'reactivated',
      subscription_id: newSubscription.id,
      property_count: propertyCount,
      monthly_amount: monthlyAmount / 100,
      currency: 'aud',
      next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString(),
      message: 'Subscription reactivated successfully'
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