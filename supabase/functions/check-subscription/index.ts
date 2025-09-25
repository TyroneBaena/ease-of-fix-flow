
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  // Use service role for DB writes (bypass RLS safely)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    log("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    if (!user?.email) throw new Error("No authenticated user or email missing");
    log("Authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // First check if user has a trial subscription in our database
    const { data: existingSubscriber } = await supabase
      .from("subscribers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If user has a trial subscription, check if it's still active
    if (existingSubscriber && existingSubscriber.subscription_tier === 'trial') {
      const trialEndDate = new Date(existingSubscriber.trial_end_date);
      const now = new Date();
      
      if (trialEndDate > now) {
        log("Active trial found", { 
          trialEndDate: existingSubscriber.trial_end_date,
          daysRemaining: Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        });
        
        return new Response(
          JSON.stringify({
            subscribed: false,
            subscription_tier: 'trial',
            subscription_end: existingSubscriber.trial_end_date,
            trial_end_date: existingSubscriber.trial_end_date,
            is_trial_active: true,
            property_count: existingSubscriber.active_properties_count || 0
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else {
        log("Trial expired", { trialEndDate: existingSubscriber.trial_end_date });
        // Trial expired, update the record
        await supabase
          .from("subscribers")
          .update({ 
            subscription_tier: null,
            is_trial_active: false,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
      }
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      log("No customer found; marking unsubscribed");
      await supabase.from("subscribers").upsert(
        {
          email: user.email,
          user_id: user.id,
          stripe_customer_id: null,
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          is_trial_active: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      return new Response(
        JSON.stringify({ 
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          is_trial_active: false,
          property_count: 0
        }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    log("Customer found", { customerId });

    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 3 });
    // Find the best status (active or trialing)
    const activeOrTrial = subs.data.find((s: any) => ["active", "trialing"].includes(s.status));

    let subscribed = false;
    let subscriptionTier: string | null = null;
    let subscriptionEnd: string | null = null;

    if (activeOrTrial) {
      subscribed = true;
      const item = activeOrTrial.items.data[0];
      const price = item?.price;
      const amount = price?.unit_amount ?? 0;
      const isYear = price?.recurring?.interval === "year";
      // Determine tier from product name or amount
      const productName = price?.product && typeof price.product !== "string" ? (price.product as any).name : undefined;
      if (productName?.toLowerCase().includes("pro") || amount >= 9900) {
        subscriptionTier = "Pro";
      } else {
        subscriptionTier = "Starter";
      }
      const periodEnd = activeOrTrial.current_period_end || activeOrTrial.trial_end;
      if (periodEnd) subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      log("Subscription found", { status: activeOrTrial.status, tier: subscriptionTier, isYear, end: subscriptionEnd });
    } else {
      log("No active or trialing subscription");
    }

    await supabase.from("subscribers").upsert(
      {
        email: user.email,
        user_id: user.id,
        stripe_customer_id: customerId,
        subscribed,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        is_trial_active: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return new Response(
      JSON.stringify({
        subscribed,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        is_trial_active: false,
        property_count: existingSubscriber?.active_properties_count || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
