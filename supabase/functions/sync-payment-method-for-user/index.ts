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
    log("Starting payment method sync for single user");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables');
    }

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      throw new Error('Only admins can sync payment methods');
    }

    log("Admin authenticated", { adminEmail: user.email });

    // Get email from request body
    const { email } = await req.json();
    
    if (!email) {
      throw new Error('Email parameter is required');
    }

    log("Syncing payment method for user", { email });

    // Get subscriber record
    const { data: subscriber, error: subscriberError } = await adminSupabase
      .from('subscribers')
      .select('*')
      .eq('email', email)
      .single();

    if (subscriberError || !subscriber) {
      log("Subscriber not found", { email, error: subscriberError });
      throw new Error(`No subscriber found for email: ${email}`);
    }

    log("Found subscriber", { 
      subscriberId: subscriber.id,
      stripeCustomerId: subscriber.stripe_customer_id,
      currentPaymentMethodId: subscriber.payment_method_id 
    });

    // Check if payment method already exists
    if (subscriber.payment_method_id) {
      log("Payment method already exists in database", { 
        paymentMethodId: subscriber.payment_method_id 
      });
      return new Response(JSON.stringify({
        success: true,
        message: 'Payment method already exists in database',
        payment_method_id: subscriber.payment_method_id,
        action: 'none',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if stripe_customer_id exists
    if (!subscriber.stripe_customer_id) {
      log("No Stripe customer ID found", { email });
      throw new Error('User has no Stripe customer ID. Cannot sync payment method.');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    log("Querying Stripe for payment methods", { 
      customerId: subscriber.stripe_customer_id 
    });

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscriber.stripe_customer_id,
      type: 'card',
      limit: 10,
    });

    log("Stripe payment methods found", { 
      count: paymentMethods.data.length,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        card: pm.card ? `${pm.card.brand} ****${pm.card.last4}` : 'unknown',
        created: pm.created
      }))
    });

    if (paymentMethods.data.length === 0) {
      log("No payment methods found in Stripe", { email });
      throw new Error('No payment methods found in Stripe for this customer. User needs to add a card.');
    }

    // Get the first (most recent) payment method
    const paymentMethod = paymentMethods.data[0];
    
    log("Selected payment method", {
      id: paymentMethod.id,
      card: paymentMethod.card ? `${paymentMethod.card.brand} ****${paymentMethod.card.last4}` : 'unknown'
    });

    // Update subscriber record with payment method ID
    const { error: updateError } = await adminSupabase
      .from('subscribers')
      .update({ 
        payment_method_id: paymentMethod.id,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      log("Error updating subscriber with payment method", { error: updateError });
      throw updateError;
    }

    log("Successfully synced payment method to database", {
      email,
      paymentMethodId: paymentMethod.id
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment method successfully synced from Stripe to database',
      email: email,
      payment_method_id: paymentMethod.id,
      card_info: paymentMethod.card ? {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
      } : null,
      action: 'updated',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Error in sync-payment-method-for-user", { error: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
