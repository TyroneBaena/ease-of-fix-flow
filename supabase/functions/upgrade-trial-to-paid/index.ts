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

    const monthlyAmount = propertyCount * 29; // $29 per property

    log("Creating metered subscription", { 
      propertyCount, 
      monthlyAmount,
      customerId: stripeCustomerId
    });

    // SECURITY FIX: Require payment method before upgrade
    const customer = await stripe.customers.retrieve(stripeCustomerId);

    // Check if customer has at least one payment method or default
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
      limit: 5,
    });

    const hasDefaultPaymentMethod = Boolean(
      customer.invoice_settings?.default_payment_method ||
      customer.default_source,
    );

    if (paymentMethods.data.length === 0 && !hasDefaultPaymentMethod) {
      log("No payment method found - upgrade blocked");
      throw new Error(
        "Payment method required. Please add a payment method before upgrading.",
      );
    }

    // Ensure we have an explicit default payment method ID for billing
    let defaultPaymentMethodId: string | undefined;

    if (customer.invoice_settings?.default_payment_method) {
      const defaultPm = customer.invoice_settings
        .default_payment_method as string | Stripe.PaymentMethod;
      defaultPaymentMethodId =
        typeof defaultPm === "string" ? defaultPm : defaultPm.id;
    } else if (paymentMethods.data.length > 0) {
      defaultPaymentMethodId = paymentMethods.data[0].id;

      // Set this card as the default for future automatic charges
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: defaultPaymentMethodId,
        },
      });
    }

    // Customer has a usable payment method, create metered subscription
    log("Payment method found, creating metered subscription", {
      defaultPaymentMethodId,
    });

    // Find or create the Property Management product
    let product;
    const existingProducts = await stripe.products.list({ limit: 10, active: true });
    const existingProduct = existingProducts.data.find(p => p.name === 'Property Management');

    if (existingProduct) {
      product = existingProduct;
      log("Reusing existing product", { productId: product.id });
    } else {
      product = await stripe.products.create({
        name: 'Property Management',
        description: 'Monthly subscription based on number of managed properties at $29 AUD each',
      });
      log("Created new product", { productId: product.id });
    }

    // Create metered price for usage-based billing
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'aud',
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        aggregate_usage: 'last_during_period',
      },
      billing_scheme: 'per_unit',
      unit_amount: 2900, // $29 per property in cents
    });

    log("Created metered price", { priceId: price.id });

    // Create metered subscription
    const newSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: price.id }],
      default_payment_method: defaultPaymentMethodId,
      collection_method: 'charge_automatically',
      metadata: {
        property_count: propertyCount.toString(),
        supabase_user_id: user.id,
        upgrade_from_trial: 'true',
        billing_type: 'metered',
      },
    });

    log("Created metered subscription", { 
      subscriptionId: newSubscription.id,
      itemsCount: newSubscription.items.data.length
    });

    // Report initial usage for the current property count
    if (newSubscription.items.data.length > 0) {
      const subscriptionItemId = newSubscription.items.data[0].id;
      
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId,
        {
          quantity: propertyCount,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'set',
        }
      );
      
      log("Reported initial usage", { 
        subscriptionItemId,
        propertyCount,
        usageRecordId: usageRecord.id
      });
    }

    // Update subscriber record to end trial and activate paid subscription
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        subscribed: true,
        subscription_tier: 'paid',
        stripe_subscription_id: newSubscription.id,
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

    log("Successfully upgraded trial to metered paid subscription", { 
      userId: user.id,
      subscriptionId: newSubscription.id,
      propertyCount,
      monthlyAmount
    });

    return new Response(JSON.stringify({
      success: true,
      status: 'paid',
      subscription_id: newSubscription.id,
      property_count: propertyCount,
      monthly_amount: monthlyAmount,
      currency: 'aud',
      billing_type: 'metered',
      next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString(),
      message: 'Successfully upgraded from trial to metered paid subscription'
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
