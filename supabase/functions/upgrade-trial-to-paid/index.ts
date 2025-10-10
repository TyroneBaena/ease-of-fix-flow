import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[UPGRADE-TRIAL-TO-PAID] ${step}`, details ? JSON.stringify(details) : '');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    log("Token extracted", { tokenLength: token.length });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !stripeKey) {
      throw new Error('Missing environment variables');
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    log("Authenticated user", { userId: user.id, email: user.email });

    // Get subscriber data
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriberError || !subscriber) {
      throw new Error('Subscriber record not found');
    }

    log("Found subscriber", { 
      userId: user.id, 
      propertyCount: subscriber.active_properties_count,
      isTrialActive: subscriber.is_trial_active,
      stripeCustomerId: subscriber.stripe_customer_id 
    });

    // Allow upgrade even if trial is not active (user might want to upgrade after trial ended)
    // if (!subscriber.is_trial_active) {
    //   throw new Error('User is not in an active trial');
    // }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Create Stripe customer if one doesn't exist
    let stripeCustomerId = subscriber.stripe_customer_id;
    if (!stripeCustomerId) {
      log("Creating new Stripe customer", { email: user.email });
      
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          created_from: 'upgrade_trial'
        }
      });
      
      stripeCustomerId = stripeCustomer.id;
      
      // Update subscriber record with Stripe customer ID
      const { error: customerUpdateError } = await supabase
        .from('subscribers')
        .update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      if (customerUpdateError) {
        log("Error updating subscriber with customer ID", { error: customerUpdateError });
        throw new Error(`Failed to update subscriber with customer ID: ${customerUpdateError.message}`);
      }
      
      log("Created Stripe customer", { customerId: stripeCustomerId });
    }

    const propertyCount = subscriber.active_properties_count || 0;

    if (propertyCount === 0) {
      throw new Error('Cannot upgrade with zero properties');
    }

    const monthlyAmount = propertyCount * 29 * 100; // $29 per property in cents

    log("Creating paid subscription", { 
      propertyCount, 
      monthlyAmount: monthlyAmount / 100,
      customerId: stripeCustomerId
    });

    // SECURITY FIX: Require payment method before upgrade
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    
    // Check if customer has a payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
      limit: 1,
    });

    if (paymentMethods.data.length === 0 && !customer.invoice_settings?.default_payment_method && !customer.default_source) {
      log("No payment method found - upgrade blocked");
      throw new Error('Payment method required. Please add a payment method before upgrading.');
    }

    // Customer has a payment method, create immediate subscription
    log("Payment method found, creating immediate subscription");

    // First create a product for this subscription
    const product = await stripe.products.create({
      name: `Property Management - ${propertyCount} properties`,
      description: `Property management billing for ${propertyCount} properties at $29 AUD each`
    });

    // Create new paid subscription
    const newSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price_data: {
          currency: 'aud',
          product: product.id,
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
        upgrade_from_trial: 'true'
      }
    });

    log("Created paid subscription", { 
      subscriptionId: newSubscription.id,
      amount: monthlyAmount / 100
    });

    // Update subscriber record to end trial and activate paid subscription
    // CRITICAL FIX: Save stripe_subscription_id for metered billing
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        subscribed: true,
        subscription_tier: 'paid',
        stripe_subscription_id: newSubscription.id, // ✅ FIXED: Added missing subscription ID
        is_trial_active: false,
        last_billing_date: new Date().toISOString(),
        next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      log("Error updating subscriber", { error: updateError });
      throw new Error(`Failed to update subscriber: ${updateError.message}`);
    }

    log("Successfully upgraded trial to paid", { 
      userId: user.id,
      subscriptionId: newSubscription.id,
      propertyCount,
      monthlyAmount: monthlyAmount / 100
    });

    return new Response(JSON.stringify({
      success: true,
      status: 'paid',
      subscription_id: newSubscription.id,
      property_count: propertyCount,
      monthly_amount: monthlyAmount / 100,
      currency: 'aud',
      next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString(),
      message: 'Successfully upgraded from trial to paid subscription'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log("Error in upgrade-trial-to-paid", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});