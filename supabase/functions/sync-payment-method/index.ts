import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[SYNC-PAYMENT-METHOD] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting payment method sync");

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

    if (!subscriber.stripe_customer_id) {
      throw new Error('No Stripe customer ID found');
    }

    log("Found subscriber", { 
      subscriberId: subscriber.id, 
      stripeCustomerId: subscriber.stripe_customer_id 
    });

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscriber.stripe_customer_id,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No payment method found in Stripe',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get the default payment method (first one)
    const paymentMethodId = paymentMethods.data[0].id;
    
    log("Found payment method in Stripe", { paymentMethodId });

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

    log("Successfully synced payment method to database");

    return new Response(JSON.stringify({
      success: true,
      payment_method_id: paymentMethodId,
      card_brand: paymentMethods.data[0].card?.brand,
      card_last4: paymentMethods.data[0].card?.last4,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Error in sync-payment-method", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
