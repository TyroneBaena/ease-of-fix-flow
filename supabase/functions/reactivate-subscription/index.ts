import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * PHASE 4: Reactivate Subscription After Payment Method Update
 * - Verifies new payment method is valid
 * - Resets failed payment count
 * - Sets payment status to active
 * - Resumes paused subscription
 * - Restores immediate access
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[REACTIVATE-SUBSCRIPTION] Processing reactivation for user ${user.email}`);

    // Get subscriber details
    const { data: subscriber, error: fetchError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !subscriber) {
      throw new Error('Subscriber not found');
    }

    if (!subscriber.stripe_customer_id || !subscriber.stripe_subscription_id) {
      throw new Error('No Stripe customer or subscription found');
    }

    // Verify payment method exists and is valid
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscriber.stripe_customer_id,
      type: 'card',
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      throw new Error('No payment method found. Please add a payment method first.');
    }

    const paymentMethod = paymentMethods.data[0];
    console.log(`[REACTIVATE-SUBSCRIPTION] Found payment method ${paymentMethod.id}`);

    // Get current subscription or create new one
    let subscription;
    
    if (subscriber.stripe_subscription_id) {
      // Try to retrieve existing subscription
      try {
        subscription = await stripe.subscriptions.retrieve(subscriber.stripe_subscription_id);
        
        if (subscription.status === 'canceled') {
          // Subscription was cancelled, create new one
          console.log(`[REACTIVATE-SUBSCRIPTION] Subscription cancelled, creating new one`);
          subscription = null;
        } else if (subscription.pause_collection) {
          // Resume paused subscription
          subscription = await stripe.subscriptions.update(subscriber.stripe_subscription_id, {
            pause_collection: null,
            default_payment_method: paymentMethod.id,
          });
          console.log(`[REACTIVATE-SUBSCRIPTION] Subscription resumed`);
        } else {
          // Update payment method on active subscription
          await stripe.subscriptions.update(subscriber.stripe_subscription_id, {
            default_payment_method: paymentMethod.id,
          });
        }
      } catch (error) {
        console.log(`[REACTIVATE-SUBSCRIPTION] Subscription not found, creating new one`);
        subscription = null;
      }
    }
    
    // Create new subscription if needed
    if (!subscription) {
      const propertyCount = subscriber.active_properties_count || 0;
      const monthlyAmount = propertyCount * 29 * 100; // cents
      
      if (propertyCount === 0) {
        throw new Error('Cannot reactivate with zero properties');
      }
      
      const product = await stripe.products.create({
        name: `Property Management - ${propertyCount} properties`,
        description: `Property management billing for ${propertyCount} properties at $29 AUD each`
      });
      
      subscription = await stripe.subscriptions.create({
        customer: subscriber.stripe_customer_id,
        default_payment_method: paymentMethod.id,
        items: [{
          price_data: {
            currency: 'aud',
            product: product.id,
            unit_amount: monthlyAmount,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }],
        metadata: {
          property_count: propertyCount.toString(),
          supabase_user_id: user.id,
        }
      });
      
      console.log(`[REACTIVATE-SUBSCRIPTION] New subscription created`);
      
      // Update subscriber with new subscription ID
      await supabase
        .from('subscribers')
        .update({
          stripe_subscription_id: subscription.id,
        })
        .eq('user_id', user.id);
    }

    // PHASE 4: Reset failed payment count and fully restore subscription access
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        // Core billing/payment fields
        payment_status: 'active',
        failed_payment_count: 0,
        payment_method_id: paymentMethod.id,
        updated_at: new Date().toISOString(),
        // Ensure subscription is marked active in app logic
        subscribed: true,
        is_cancelled: false,
        is_trial_active: false,
        subscription_status: 'active',
        cancellation_date: null,
        subscription_end: null,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[REACTIVATE-SUBSCRIPTION] Error updating subscriber:', updateError);
      throw updateError;
    }

    console.log(`[REACTIVATE-SUBSCRIPTION] Account reactivated successfully for ${user.email}`);

    // Send reactivation confirmation email
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-reactivation-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          recipient_email: subscriber.email,
          recipient_name: user.email?.split('@')[0] || 'Customer',
        }),
      });
    } catch (emailError) {
      console.error('[REACTIVATE-SUBSCRIPTION] Failed to send confirmation email:', emailError);
      // Don't throw - reactivation succeeded even if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription reactivated successfully',
        payment_status: 'active',
        failed_payment_count: 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("[REACTIVATE-SUBSCRIPTION] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});