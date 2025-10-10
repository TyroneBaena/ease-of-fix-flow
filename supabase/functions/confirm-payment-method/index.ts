import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[CONFIRM-PAYMENT-METHOD] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting payment method confirmation");

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
      throw new Error('No subscription record found');
    }

    log("Found subscriber", { 
      subscriberId: subscriber.id, 
      stripeCustomerId: subscriber.stripe_customer_id,
      setupIntentId: subscriber.setup_intent_id 
    });

    // Get the setup intent to retrieve the payment method
    if (!subscriber.setup_intent_id) {
      throw new Error('No setup intent found for this user');
    }

    const setupIntent = await stripe.setupIntents.retrieve(subscriber.setup_intent_id);
    
    if (setupIntent.status !== 'succeeded') {
      throw new Error('Setup intent has not succeeded yet');
    }

    const paymentMethodId = setupIntent.payment_method as string;
    
    if (!paymentMethodId) {
      throw new Error('No payment method found on setup intent');
    }

    log("Retrieved payment method from setup intent", { paymentMethodId });

    // Update subscriber with payment method ID
    const { error: updateError } = await adminSupabase
      .from('subscribers')
      .update({ 
        payment_method_id: paymentMethodId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      log("Error updating subscriber with payment method", { error: updateError });
      throw updateError;
    }

    log("Successfully saved payment method to database");

    return new Response(JSON.stringify({
      success: true,
      payment_method_id: paymentMethodId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Error in confirm-payment-method", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
