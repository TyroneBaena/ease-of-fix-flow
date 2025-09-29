import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[CALCULATE-PROPERTY-BILLING] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting property billing calculation");

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

    // For JWT-verified functions, user context is available via request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Extract user ID from JWT payload (already verified by Supabase)
    const jwt = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      // Simple JWT payload decode (no verification needed as Supabase already verified)
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub;
      if (!userId) {
        throw new Error('No user ID in JWT');
      }
    } catch (error) {
      log("JWT decode error", { error });
      throw new Error('Invalid JWT token');
    }

    log("User authenticated from JWT", { userId });

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

    log("Found subscriber", { subscriberId: subscriber.id });

    // Calculate billing based on property count
    const propertyCount = subscriber.active_properties_count || 0;
    const monthlyAmount = propertyCount * 29; // $29 AUD per property per month

    log("Calculated billing", { propertyCount, monthlyAmount });

    // Check if user is still in trial - calculate based on actual trial end date
    const now = new Date();
    const trialEndDate = subscriber.trial_end_date ? new Date(subscriber.trial_end_date) : null;
    const isTrialActive = trialEndDate && now < trialEndDate && !subscriber.is_cancelled;

    if (isTrialActive) {
      const trialEndDate = new Date(subscriber.trial_end_date);
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      log("User still in trial", { daysRemaining });
      
      return new Response(JSON.stringify({
        success: true,
        in_trial: true,
        trial_end_date: subscriber.trial_end_date,
        days_remaining: daysRemaining,
        property_count: propertyCount,
        monthly_amount: monthlyAmount,
        currency: 'aud'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Trial has ended, handle billing
    if (subscriber.stripe_customer_id) {
      log("Processing post-trial billing", { customerId: subscriber.stripe_customer_id });

      // Check for existing active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: subscriber.stripe_customer_id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        // Update existing subscription
        const subscription = subscriptions.data[0];
        log("Found existing subscription", { subscriptionId: subscription.id });

        // Update subscription with current property count
        const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
          metadata: {
            property_count: propertyCount.toString(),
            monthly_amount: monthlyAmount.toString(),
          },
        });

        // Update subscriber record
        const { error: updateError } = await adminSupabase
          .from('subscribers')
          .update({
            subscribed: true,
            subscription_tier: 'Pro',
            next_billing_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriber.id);

        if (updateError) {
          log("Error updating subscriber", { updateError });
          throw new Error('Failed to update subscriber');
        }

        return new Response(JSON.stringify({
          success: true,
          subscribed: true,
          subscription_id: updatedSubscription.id,
          property_count: propertyCount,
          monthly_amount: monthlyAmount,
          currency: 'aud',
          next_billing_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      } else if (propertyCount > 0) {
        // Create new subscription
        log("Creating new subscription", { propertyCount, monthlyAmount });

        // Create a simple product and price for billing
        const product = await stripe.products.create({
          name: 'Property Management Subscription',
          metadata: {
            user_id: userId,
          },
        });

        const price = await stripe.prices.create({
          unit_amount: monthlyAmount * 100, // Convert to cents
          currency: 'aud',
          recurring: {
            interval: 'month',
          },
          product: product.id,
        });

        // Check if customer has a payment method
        const paymentMethods = await stripe.paymentMethods.list({
          customer: subscriber.stripe_customer_id,
          type: 'card',
        });

        let subscription;
        if (paymentMethods.data.length === 0) {
          // No payment method - create subscription with incomplete status
          subscription = await stripe.subscriptions.create({
            customer: subscriber.stripe_customer_id,
            items: [{ price: price.id }],
            payment_behavior: 'default_incomplete',
            payment_settings: {
              payment_method_types: ['card'],
              save_default_payment_method: 'on_subscription',
            },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
              property_count: propertyCount.toString(),
              user_id: userId,
            },
          });
        } else {
          // Has payment method - create normal subscription
          subscription = await stripe.subscriptions.create({
            customer: subscriber.stripe_customer_id,
            items: [{ price: price.id }],
            metadata: {
              property_count: propertyCount.toString(),
              user_id: userId,
            },
          });
        }

        // Update subscriber record based on subscription status
        const isActive = subscription.status === 'active';
        const needsPaymentMethod = subscription.status === 'incomplete';
        
        // Check if user still has trial time remaining - calculate properly
        const trialEndDate = subscriber.trial_end_date ? new Date(subscriber.trial_end_date) : null;
        const trialStillActive = trialEndDate && new Date() < trialEndDate && !subscriber.is_cancelled;
        
        const { error: updateError } = await adminSupabase
          .from('subscribers')
          .update({
            subscribed: isActive,
            subscription_tier: isActive ? 'Pro' : 'Pending',
            next_billing_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            // Keep trial active if it hasn't expired yet, regardless of previous flag state
            is_trial_active: trialStillActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriber.id);

        if (updateError) {
          log("Error updating subscriber", { updateError });
          throw new Error('Failed to update subscriber');
        }

        const response: any = {
          success: true,
          subscribed: isActive,
          subscription_id: subscription.id,
          property_count: propertyCount,
          monthly_amount: monthlyAmount,
          currency: 'aud',
          status: subscription.status,
        };

        // Add payment setup info if needed
        if (needsPaymentMethod) {
          response.needs_payment_method = true;
          response.message = 'Subscription created but requires payment method setup';
          if (subscription.latest_invoice?.payment_intent) {
            response.client_secret = subscription.latest_invoice.payment_intent.client_secret;
          }
        } else {
          response.next_billing_date = new Date(subscription.current_period_end * 1000).toISOString();
        }

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // No billing needed (0 properties or no customer)
    return new Response(JSON.stringify({
      success: true,
      subscribed: false,
      property_count: propertyCount,
      monthly_amount: monthlyAmount,
      currency: 'aud',
      message: propertyCount === 0 ? 'No properties to bill for' : 'No customer setup'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log("Error in calculate-property-billing", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});