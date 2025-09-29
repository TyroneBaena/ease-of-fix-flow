import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[REACTIVATE-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting subscription reactivation");

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get the authorization header and extract JWT payload
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    // Extract JWT payload directly (since verify_jwt = true handles verification)
    const jwt = authHeader.replace('Bearer ', '');
    const jwtPayload = JSON.parse(atob(jwt.split('.')[1]));
    
    const userId = jwtPayload.sub;
    const userEmail = jwtPayload.email;
    
    if (!userId || !userEmail) {
      throw new Error('Invalid JWT payload');
    }

    log("User authenticated", { userId, userEmail });

    // Create admin client
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get subscriber data
    const { data: subscriber, error: subscriberError } = await adminSupabase
      .from('subscribers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subscriberError) {
      log("Error fetching subscriber", { subscriberError });
      throw new Error('Subscriber not found');
    }

    log("Found subscriber", { subscriberId: subscriber.id, isCancelled: subscriber.is_cancelled });

    if (!subscriber.is_cancelled) {
      throw new Error('Subscription is not cancelled');
    }

    // Check if user has active properties
    const { data: properties, error: propertiesError } = await adminSupabase
      .from('properties')
      .select('id')
      .eq('user_id', userId);

    if (propertiesError) {
      log("Error fetching properties", { propertiesError });
      throw new Error('Failed to fetch user properties');
    }

    const propertyCount = properties?.length || 0;
    log("Property count", { propertyCount });

    if (propertyCount === 0) {
      // Reactivate as trial (no properties)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 30);

      const { data: updatedSubscriber, error: updateError } = await adminSupabase
        .from('subscribers')
        .update({
          is_trial_active: true,
          is_cancelled: false,
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          cancellation_date: null,
          subscribed: false,
          active_properties_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriber.id)
        .select()
        .single();

      if (updateError) {
        log("Error updating subscriber for trial", { updateError });
        throw new Error('Failed to reactivate as trial');
      }

      log("Reactivated as trial", { subscriberId: updatedSubscriber.id });

      return new Response(JSON.stringify({
        success: true,
        reactivated_as: 'trial',
        trial_end_date: trialEndDate.toISOString(),
        property_count: 0,
        message: 'Reactivated with 30-day trial (no properties)',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      // Reactivate as paid subscription
      const monthlyAmount = propertyCount * 29;

      log("Creating paid subscription", { propertyCount, monthlyAmount });

      // Create or get Stripe customer
      let customer;
      let customerCurrency = 'aud'; // Default to AUD
      
      if (subscriber.stripe_customer_id) {
        customer = await stripe.customers.retrieve(subscriber.stripe_customer_id);
        
        // Use AUD for consistency across the platform
        customerCurrency = 'aud';
        log("Using AUD currency for consistency", { currency: customerCurrency });
      } else {
        customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabase_user_id: userId,
          },
        });
      }

      log("Customer currency determined", { currency: customerCurrency });

      // Create product and price
      const product = await stripe.products.create({
        name: 'Property Management Subscription',
        metadata: {
          user_id: userId,
        },
      });

      const price = await stripe.prices.create({
        unit_amount: monthlyAmount * 100, // Convert to cents
        currency: customerCurrency,
        recurring: {
          interval: 'month',
        },
        product: product.id,
      });

      // Check if customer has a payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card',
      });

      let subscription;
      
      if (paymentMethods.data.length === 0) {
        // No payment method - create subscription with trial for payment method collection
        log("No payment method found, creating subscription with trial period");
        
        subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price.id }],
          trial_period_days: 7, // Give 7 days to add payment method
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
          },
          metadata: {
            property_count: propertyCount.toString(),
            user_id: userId,
            reactivation: 'true',
          },
        });
        
        log("Subscription created with trial for payment method collection", { 
          subscriptionId: subscription.id,
          status: subscription.status 
        });
      } else {
        // Payment method exists - create immediate subscription
        log("Payment method found, creating immediate subscription");
        
        subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price.id }],
          metadata: {
            property_count: propertyCount.toString(),
            user_id: userId,
            reactivation: 'true',
          },
        });
        
        log("Immediate subscription created", { 
          subscriptionId: subscription.id,
          status: subscription.status 
        });
      }

      // Update subscriber record
      const { data: updatedSubscriber, error: updateError } = await adminSupabase
        .from('subscribers')
        .update({
          is_trial_active: false,
          is_cancelled: false,
          subscribed: true,
          subscription_tier: 'Pro',
          stripe_customer_id: customer.id,
          next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
          active_properties_count: propertyCount,
          cancellation_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriber.id)
        .select()
        .single();

      if (updateError) {
        log("Error updating subscriber for paid", { updateError });
        throw new Error('Failed to reactivate as paid subscription');
      }

      log("Reactivated as paid subscription", { 
        subscriberId: updatedSubscriber.id, 
        subscriptionId: subscription.id 
      });

      return new Response(JSON.stringify({
        success: true,
        reactivated_as: 'paid',
        subscription_id: subscription.id,
        subscription_status: subscription.status,
        property_count: propertyCount,
        monthly_amount: monthlyAmount,
        currency: customerCurrency,
        next_billing_date: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : new Date(subscription.current_period_end * 1000).toISOString(),
        message: paymentMethods.data.length === 0 
          ? 'Reactivated with 7-day trial to add payment method'
          : 'Reactivated with immediate paid subscription',
        requires_payment_method: paymentMethods.data.length === 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log("Error in reactivate-subscription", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});