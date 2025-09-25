import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[CREATE-TRIAL] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const applicationUrl = Deno.env.get("APPLICATION_URL") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("No authenticated user or email missing");
    log("Authenticated user", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = existingCustomers.data[0]?.id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          trial_signup: "true"
        }
      });
      customerId = customer.id;
      log("Created new Stripe customer", { customerId });
    } else {
      log("Using existing Stripe customer", { customerId });
    }

    // Create Setup Intent for card collection without charge
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        purpose: 'trial_signup',
        supabase_user_id: user.id
      }
    });

    log("Created Setup Intent", { setupIntentId: setupIntent.id });

    // Calculate trial end date (30 days from now)
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    // Get user's organization to count properties
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const organizationId = profile?.organization_id;
    let propertyCount = 0;

    if (organizationId) {
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('organization_id', organizationId);
      
      propertyCount = properties?.length || 0;
      log("Property count for trial", { organizationId, propertyCount });
    }

    // Create or update subscriber record with trial info using admin client to bypass RLS
    const { error: upsertError } = await supabaseAdmin
      .from('subscribers')
      .upsert({
        user_id: user.id,
        email: user.email,
        subscribed: false, // Trial status, not yet subscribed
        stripe_customer_id: customerId,
        subscription_tier: 'trial',
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        is_trial_active: true, // Add this field
        active_properties_count: propertyCount,
        last_billing_date: null,
        next_billing_date: trialEndDate.toISOString(), // First billing after trial
        payment_method_id: null, // Will be updated when setup intent is confirmed
        is_cancelled: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      log("Error creating subscriber record", { error: upsertError });
      throw new Error(`Failed to create subscriber record: ${upsertError.message}`);
    }

    log("Created trial subscription record", { userId: user.id, trialEndDate });

    const origin = req.headers.get("origin") || applicationUrl || "http://localhost:3000";

    return new Response(JSON.stringify({
      success: true,
      setup_intent_client_secret: setupIntent.client_secret,
      customer_id: customerId,
      trial_end_date: trialEndDate.toISOString(),
      property_count: propertyCount,
      success_url: `${origin}/billing?trial=success`,
      cancel_url: `${origin}/pricing?trial=cancel`
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