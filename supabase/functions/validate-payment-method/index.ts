import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[VALIDATE-PAYMENT-METHOD] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting payment method validation");

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
      return new Response(JSON.stringify({
        has_payment_method: false,
        message: 'No subscription record found'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if customer has payment method in Stripe
    if (!subscriber.stripe_customer_id) {
      return new Response(JSON.stringify({
        has_payment_method: false,
        message: 'No Stripe customer ID'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscriber.stripe_customer_id,
      type: 'card',
    });

    const hasPaymentMethod = paymentMethods.data.length > 0;
    log("Payment method check", { hasPaymentMethod, count: paymentMethods.data.length });

    // If payment method exists, update subscriber record
    if (hasPaymentMethod && !subscriber.payment_method_id) {
      const { error: updateError } = await adminSupabase
        .from('subscribers')
        .update({ payment_method_id: paymentMethods.data[0].id })
        .eq('user_id', userId);

      if (updateError) {
        log("Error updating payment_method_id", { updateError });
      } else {
        log("Updated payment_method_id in subscriber record");
      }
    }

    return new Response(JSON.stringify({
      has_payment_method: hasPaymentMethod,
      payment_method: hasPaymentMethod ? {
        brand: paymentMethods.data[0].card?.brand,
        last4: paymentMethods.data[0].card?.last4,
        exp_month: paymentMethods.data[0].card?.exp_month,
        exp_year: paymentMethods.data[0].card?.exp_year,
      } : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Error in validate-payment-method", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
