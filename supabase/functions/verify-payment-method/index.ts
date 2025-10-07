import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[VERIFY-PAYMENT-METHOD] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting payment method verification");

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
      throw new Error('No subscription record found');
    }

    log("Found subscriber", { 
      subscriberId: subscriber.id, 
      stripeCustomerId: subscriber.stripe_customer_id,
      setupIntentId: subscriber.setup_intent_id
    });

    if (!subscriber.stripe_customer_id) {
      return new Response(JSON.stringify({
        success: true,
        hasCustomer: false,
        hasPaymentMethod: false,
        message: 'No Stripe customer found'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch customer from Stripe with payment methods
    const customer = await stripe.customers.retrieve(subscriber.stripe_customer_id, {
      expand: ['default_source']
    });

    // List payment methods for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscriber.stripe_customer_id,
      type: 'card',
    });

    log("Payment methods found", { count: paymentMethods.data.length });

    // Get SetupIntent details if available
    let setupIntentStatus = null;
    if (subscriber.setup_intent_id) {
      const setupIntent = await stripe.setupIntents.retrieve(subscriber.setup_intent_id);
      setupIntentStatus = {
        id: setupIntent.id,
        status: setupIntent.status,
        payment_method: setupIntent.payment_method,
      };
      log("SetupIntent status", setupIntentStatus);
    }

    return new Response(JSON.stringify({
      success: true,
      hasCustomer: true,
      customerId: subscriber.stripe_customer_id,
      customerEmail: 'email' in customer ? customer.email : null,
      hasPaymentMethod: paymentMethods.data.length > 0,
      paymentMethodCount: paymentMethods.data.length,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        } : null,
      })),
      setupIntent: setupIntentStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Error in verify-payment-method", { error: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
