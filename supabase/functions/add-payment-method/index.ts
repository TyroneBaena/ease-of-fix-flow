import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[ADD-PAYMENT-METHOD] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting payment method addition for existing trial user");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    log("User authenticated", { userId });

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get subscriber record
    const { data: subscriber, error: subscriberError } = await adminSupabase
      .from('subscribers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subscriberError || !subscriber) {
      log("No subscriber found", { subscriberError });
      throw new Error('No subscription record found. Please start a trial first.');
    }

    log("Found subscriber", { subscriberId: subscriber.id, stripeCustomerId: subscriber.stripe_customer_id });

    // If no Stripe customer exists, create one
    let stripeCustomerId = subscriber.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const { data: { user } } = await adminSupabase.auth.admin.getUserById(userId);
      
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: {
          supabase_user_id: userId,
        },
      });

      stripeCustomerId = customer.id;
      log("Created new Stripe customer", { customerId: stripeCustomerId });

      // Update subscriber with customer ID
      await adminSupabase
        .from('subscribers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', userId);
    }

    // Create SetupIntent for collecting payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        user_id: userId,
        subscriber_id: subscriber.id,
      },
    });

    log("Created SetupIntent", { setupIntentId: setupIntent.id });

    // Update subscriber with setup intent
    await adminSupabase
      .from('subscribers')
      .update({ 
        stripe_setup_intent_id: setupIntent.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return new Response(JSON.stringify({
      success: true,
      client_secret: setupIntent.client_secret,
      customer_id: stripeCustomerId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Error in add-payment-method", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
