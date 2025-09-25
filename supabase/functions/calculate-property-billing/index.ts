import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CALCULATE-BILLING] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
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
      .maybeSingle();

    if (subscriberError) {
      throw new Error(`Error fetching subscriber: ${subscriberError.message}`);
    }

    if (!subscriber) {
      throw new Error(`No subscriber record found for user: ${user.id}`);
    }

    log("Found subscriber", { 
      userId: user.id, 
      propertyCount: subscriber.active_properties_count,
      trialEnd: subscriber.trial_end_date 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const propertyCount = subscriber.active_properties_count || 0;
    const monthlyAmount = propertyCount * 29 * 100; // $29 per property in cents
    
    // Check if user is still in trial
    const trialEndDate = new Date(subscriber.trial_end_date);
    const now = new Date();
    const isTrialActive = now < trialEndDate;

    log("Billing calculation", { 
      propertyCount, 
      monthlyAmount: monthlyAmount / 100,
      isTrialActive,
      trialEndDate: trialEndDate.toISOString()
    });

    // If trial is still active, return trial info
    if (isTrialActive) {
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return new Response(JSON.stringify({
        status: 'trial',
        trial_active: true,
        days_remaining: daysRemaining,
        trial_end_date: trialEndDate.toISOString(),
        property_count: propertyCount,
        monthly_amount: monthlyAmount / 100,
        currency: 'aud'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Trial has ended, need to handle billing
    if (!subscriber.stripe_customer_id) {
      throw new Error("No Stripe customer ID found for user");
    }

    const customerId = subscriber.stripe_customer_id;

    // Check if customer has existing subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (existingSubscriptions.data.length > 0) {
      const subscription = existingSubscriptions.data[0];
      log("Found existing subscription", { subscriptionId: subscription.id });

      // Update subscription with current property count
      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
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
        proration_behavior: 'always_invoice'
      });

      log("Updated subscription", { 
        subscriptionId: updatedSubscription.id,
        amount: monthlyAmount / 100
      });

      // Update subscriber record
      await supabase
        .from('subscribers')
        .update({
          subscribed: true,
          subscription_tier: 'paid',
          last_billing_date: new Date().toISOString(),
          next_billing_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        status: 'updated',
        subscription_id: updatedSubscription.id,
        property_count: propertyCount,
        monthly_amount: monthlyAmount / 100,
        currency: 'aud',
        next_billing_date: new Date(updatedSubscription.current_period_end * 1000).toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // No existing subscription, create new one
    if (propertyCount === 0) {
      // No properties, no billing needed
      return new Response(JSON.stringify({
        status: 'no_billing',
        property_count: 0,
        message: 'No properties to bill for'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create new subscription
    const newSubscription = await stripe.subscriptions.create({
      customer: customerId,
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
        supabase_user_id: user.id
      }
    });

    log("Created new subscription", { 
      subscriptionId: newSubscription.id,
      amount: monthlyAmount / 100
    });

    // Update subscriber record
    await supabase
      .from('subscribers')
      .update({
        subscribed: true,
        subscription_tier: 'paid',
        last_billing_date: new Date().toISOString(),
        next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      status: 'created',
      subscription_id: newSubscription.id,
      property_count: propertyCount,
      monthly_amount: monthlyAmount / 100,
      currency: 'aud',
      next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString()
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