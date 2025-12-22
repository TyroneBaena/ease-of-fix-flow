import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[FIX-SUBSCRIPTION-BILLING] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const { email, userId, dryRun = true, fixAll = false } = await req.json();

    log('Function started', { email, userId, dryRun, fixAll });

    const results: Array<{
      email: string;
      userId: string;
      status: string;
      propertyCount?: number;
      oldSubscriptionId?: string;
      newSubscriptionId?: string;
      error?: string;
    }> = [];

    // Build query for subscribers to fix
    let query = supabase
      .from('subscribers')
      .select('*')
      .eq('subscribed', true)
      .not('stripe_subscription_id', 'is', null);

    if (email) {
      query = query.eq('email', email);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (!fixAll) {
      throw new Error('Must provide email, userId, or set fixAll to true');
    }

    const { data: subscribers, error: subError } = await query;

    if (subError) {
      throw new Error(`Failed to fetch subscribers: ${subError.message}`);
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No subscribers found to fix', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('Found subscribers to check', { count: subscribers.length });

    for (const subscriber of subscribers) {
      try {
        log('Checking subscriber', { email: subscriber.email, userId: subscriber.user_id });

        // Get current subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriber.stripe_subscription_id);
        
        if (subscription.items.data.length === 0) {
          results.push({
            email: subscriber.email,
            userId: subscriber.user_id,
            status: 'error',
            error: 'Subscription has no items',
          });
          continue;
        }

        const subscriptionItem = subscription.items.data[0];
        const price = await stripe.prices.retrieve(subscriptionItem.price.id);

        // Check if already metered
        if (price.recurring?.usage_type === 'metered') {
          log('Subscription is already metered', { subscriptionId: subscription.id });
          results.push({
            email: subscriber.email,
            userId: subscriber.user_id,
            status: 'already_metered',
            oldSubscriptionId: subscription.id,
          });
          continue;
        }

        log('Found non-metered subscription to fix', { 
          subscriptionId: subscription.id,
          priceType: price.recurring?.usage_type || 'fixed'
        });

        // Get property count for this organization
        const { count: propertyCount, error: countError } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', subscriber.organization_id);

        if (countError) {
          throw new Error(`Failed to count properties: ${countError.message}`);
        }

        const actualPropertyCount = propertyCount || 0;
        const monthlyAmount = actualPropertyCount * 29;

        log('Property count for organization', { 
          organizationId: subscriber.organization_id,
          propertyCount: actualPropertyCount,
          monthlyAmount
        });

        if (dryRun) {
          results.push({
            email: subscriber.email,
            userId: subscriber.user_id,
            status: 'would_fix',
            propertyCount: actualPropertyCount,
            oldSubscriptionId: subscription.id,
          });
          continue;
        }

        // Actually fix the subscription
        // Step 1: Cancel the old subscription at period end (to avoid disruption)
        await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
          metadata: {
            ...subscription.metadata,
            migrated_to_metered: 'true',
            migration_date: new Date().toISOString(),
          },
        });

        log('Marked old subscription for cancellation', { subscriptionId: subscription.id });

        // Step 2: Find or create the Property Management product
        let product;
        const existingProducts = await stripe.products.list({ limit: 10, active: true });
        const existingProduct = existingProducts.data.find(p => p.name === 'Property Management');

        if (existingProduct) {
          product = existingProduct;
        } else {
          product = await stripe.products.create({
            name: 'Property Management',
            description: 'Monthly subscription based on number of managed properties at $29 AUD each',
          });
        }

        // Step 3: Create metered price
        const newPrice = await stripe.prices.create({
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

        log('Created metered price', { priceId: newPrice.id });

        // Step 4: Create new metered subscription starting at next billing cycle
        const newSubscription = await stripe.subscriptions.create({
          customer: subscriber.stripe_customer_id,
          items: [{ price: newPrice.id }],
          collection_method: 'charge_automatically',
          billing_cycle_anchor: subscription.current_period_end, // Start when old one ends
          proration_behavior: 'none',
          metadata: {
            property_count: actualPropertyCount.toString(),
            supabase_user_id: subscriber.user_id,
            migrated_from: subscription.id,
            billing_type: 'metered',
          },
        });

        log('Created new metered subscription', { 
          newSubscriptionId: newSubscription.id,
          startsAt: new Date(subscription.current_period_end * 1000).toISOString()
        });

        // Step 5: Report initial usage on the new subscription
        if (newSubscription.items.data.length > 0 && actualPropertyCount > 0) {
          await stripe.subscriptionItems.createUsageRecord(
            newSubscription.items.data[0].id,
            {
              quantity: actualPropertyCount,
              timestamp: Math.floor(Date.now() / 1000),
              action: 'set',
            }
          );
          log('Reported initial usage', { propertyCount: actualPropertyCount });
        }

        // Step 6: Update subscriber record with new subscription ID
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({
            stripe_subscription_id: newSubscription.id,
            active_properties_count: actualPropertyCount,
            next_billing_date: new Date(newSubscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', subscriber.user_id);

        if (updateError) {
          log('Warning: Failed to update subscriber record', { error: updateError.message });
        }

        results.push({
          email: subscriber.email,
          userId: subscriber.user_id,
          status: 'fixed',
          propertyCount: actualPropertyCount,
          oldSubscriptionId: subscription.id,
          newSubscriptionId: newSubscription.id,
        });

        log('Successfully fixed subscription', { 
          email: subscriber.email,
          oldId: subscription.id,
          newId: newSubscription.id,
          propertyCount: actualPropertyCount
        });

      } catch (error: any) {
        log('Error fixing subscriber', { 
          email: subscriber.email, 
          error: error.message 
        });
        results.push({
          email: subscriber.email,
          userId: subscriber.user_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    const summary = {
      total: results.length,
      fixed: results.filter(r => r.status === 'fixed').length,
      alreadyMetered: results.filter(r => r.status === 'already_metered').length,
      wouldFix: results.filter(r => r.status === 'would_fix').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    log('Fix completed', summary);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
