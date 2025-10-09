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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const authHeader = req.headers.get('Authorization');
    
    // Check if Authorization header exists
    if (!authHeader) {
      log('Missing Authorization header');
      throw new Error('Unauthorized: No Authorization header provided');
    }

    log('Auth header present', { 
      hasBearer: authHeader.startsWith('Bearer '),
      tokenLength: authHeader.split(' ')[1]?.length || 0
    });
    
    // Extract the JWT token for debugging
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to check if it's valid (without verification, just to see the payload)
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        log('JWT payload info', { 
          sub: payload.sub?.substring(0, 8), 
          exp: payload.exp,
          iat: payload.iat,
          isExpired: payload.exp < Math.floor(Date.now() / 1000)
        });
      }
    } catch (e) {
      log('JWT decode error', { error: String(e) });
    }
    
    // Create Supabase client - use ANON key with JWT token for user validation
    // This properly validates the user's JWT token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Authenticate user - the JWT will be validated against the ANON key
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      log('Auth error details', { 
        error: userError.message, 
        status: userError.status,
        name: userError.name 
      });
      throw new Error(`Unauthorized: ${userError.message}`);
    }
    
    if (!user) {
      log('No user found despite successful auth');
      throw new Error('Unauthorized: User not found');
    }

    log('User authenticated', { userId: user.id });

    // Now use Service Role key for database operations to bypass RLS
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

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

      log('Retrieved subscription', { 
        subscriptionId: subscription.id,
        status: subscription.status,
        itemsCount: subscription.items.data.length
      });

      if (subscription.items.data.length === 0) {
        throw new Error('No subscription items found');
      }

      const subscriptionItem = subscription.items.data[0];
      const subscriptionItemId = subscriptionItem.id;

      // Verify this is a metered price
      const price = await stripe.prices.retrieve(subscriptionItem.price.id);
      if (price.recurring?.usage_type !== 'metered') {
        log('Warning: Subscription is not metered', { priceId: price.id });
        throw new Error('Subscription must use metered billing. Please contact support.');
      }

      // Report current usage with 'set' action to replace previous value
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId,
        {
          quantity: actualCount,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'set', // Replace the quantity for this billing period
        }
      );

      log('Usage reported to Stripe', { 
        subscriptionItemId, 
        quantity: actualCount,
        usageRecordId: usageRecord.id
      });

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
