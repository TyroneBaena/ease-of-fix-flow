import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[CALCULATE-BILLING-METERED] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    log('User authenticated', { userId: user.id });

    // Get subscriber info
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscriber) {
      throw new Error('Subscriber not found');
    }

    log('Found subscriber', { 
      subscriberId: subscriber.id,
      hasSubscription: !!subscriber.stripe_subscription_id 
    });

    // Count active properties
    const { count: propertyCount, error: countError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      throw new Error(`Failed to count properties: ${countError.message}`);
    }

    const actualCount = propertyCount || 0;
    const monthlyAmount = actualCount * 29;

    log('Calculated billing', { propertyCount: actualCount, monthlyAmount });

    // If user is still in trial, just update the count
    if (subscriber.is_trial_active && !subscriber.subscribed) {
      log('User still in trial, updating count only');
      
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          active_properties_count: actualCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Failed to update count: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          in_trial: true,
          property_count: actualCount,
          monthly_amount: monthlyAmount,
          currency: 'AUD'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no active subscription, return early
    if (!subscriber.stripe_subscription_id) {
      log('No active subscription');
      return new Response(
        JSON.stringify({
          success: true,
          has_subscription: false,
          property_count: actualCount,
          monthly_amount: monthlyAmount,
          currency: 'AUD'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update subscription usage (metered billing)
    try {
      const subscription = await stripe.subscriptions.retrieve(
        subscriber.stripe_subscription_id
      );

      if (subscription.items.data.length > 0) {
        const subscriptionItemId = subscription.items.data[0].id;

        // Report current usage
        await stripe.subscriptionItems.createUsageRecord(
          subscriptionItemId,
          {
            quantity: actualCount,
            timestamp: Math.floor(Date.now() / 1000),
            action: 'set'
          }
        );

        log('Usage reported to Stripe', { 
          subscriptionItemId, 
          quantity: actualCount 
        });
      }

      // Update local database
      const { error: updateError } = await supabase
        .from('subscribers')
        .update({
          active_properties_count: actualCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Failed to update subscriber: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          property_count: actualCount,
          monthly_amount: monthlyAmount,
          currency: 'AUD',
          next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
          metered_billing: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (stripeError: any) {
      log('Stripe error', stripeError.message);
      throw new Error(`Stripe update failed: ${stripeError.message}`);
    }

  } catch (error: any) {
    log('Error', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
