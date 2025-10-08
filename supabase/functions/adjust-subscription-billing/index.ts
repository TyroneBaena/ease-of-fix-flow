import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log("[ADJUST-BILLING] Starting monthly billing adjustment check");

    // Get all active subscriptions
    const { data: activeSubscriptions, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, email, active_properties_count, stripe_subscription_id, stripe_customer_id")
      .eq("subscribed", true)
      .eq("is_cancelled", false)
      .not("stripe_subscription_id", "is", null);

    if (fetchError) {
      console.error("[ADJUST-BILLING] Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`[ADJUST-BILLING] Found ${activeSubscriptions?.length || 0} active subscriptions`);

    const adjustments = [];

    for (const subscriber of activeSubscriptions || []) {
      try {
        // Get current subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriber.stripe_subscription_id);
        
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          console.log(`[ADJUST-BILLING] Skipping ${subscriber.email} - subscription not active`);
          continue;
        }

        const currentPropertyCount = subscriber.active_properties_count || 0;
        const currentMonthlyAmount = currentPropertyCount * 29;

        // Get current price from subscription
        const currentItem = subscription.items.data[0];
        const currentPrice = currentItem.price;
        const currentAmount = (currentPrice.unit_amount || 0) / 100; // Convert from cents

        // Check if adjustment is needed
        if (currentAmount === currentMonthlyAmount) {
          console.log(`[ADJUST-BILLING] No adjustment needed for ${subscriber.email}`);
          adjustments.push({
            email: subscriber.email,
            status: 'no_change_needed',
            property_count: currentPropertyCount,
          });
          continue;
        }

        console.log(`[ADJUST-BILLING] Adjusting billing for ${subscriber.email} from $${currentAmount} to $${currentMonthlyAmount}`);

        if (currentPropertyCount === 0) {
          // Cancel subscription if no properties
          console.log(`[ADJUST-BILLING] Cancelling subscription for ${subscriber.email} - no properties`);
          
          await stripe.subscriptions.cancel(subscriber.stripe_subscription_id);
          
          await supabase
            .from("subscribers")
            .update({
              subscribed: false,
              is_cancelled: true,
              cancellation_date: new Date().toISOString(),
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", subscriber.user_id);

          adjustments.push({
            email: subscriber.email,
            status: 'cancelled_no_properties',
            property_count: 0,
          });
          continue;
        }

        // Create new product and price for the updated property count
        const product = await stripe.products.create({
          name: `Property Management - ${currentPropertyCount} ${currentPropertyCount === 1 ? 'Property' : 'Properties'}`,
          description: `Subscription for ${currentPropertyCount} managed ${currentPropertyCount === 1 ? 'property' : 'properties'}`,
          metadata: {
            user_id: subscriber.user_id,
            property_count: currentPropertyCount.toString(),
          },
        });

        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: currentMonthlyAmount * 100,
          currency: "aud",
          recurring: {
            interval: "month",
          },
          metadata: {
            user_id: subscriber.user_id,
            property_count: currentPropertyCount.toString(),
          },
        });

        // Update subscription with new price
        await stripe.subscriptions.update(subscriber.stripe_subscription_id, {
          items: [{
            id: currentItem.id,
            price: newPrice.id,
          }],
          proration_behavior: 'create_prorations', // Prorate the difference
          metadata: {
            property_count: currentPropertyCount.toString(),
            last_adjusted: new Date().toISOString(),
          },
        });

        console.log(`[ADJUST-BILLING] Successfully adjusted billing for ${subscriber.email}`);

        // Send notification about billing change
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-billing-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              recipient_email: subscriber.email,
              recipient_name: subscriber.email.split('@')[0],
              old_property_count: Math.round(currentAmount / 29),
              new_property_count: currentPropertyCount,
              old_monthly_amount: currentAmount,
              new_monthly_amount: currentMonthlyAmount,
              change_type: currentPropertyCount > Math.round(currentAmount / 29) ? 'increase' : 'decrease',
              is_trial: false,
              is_subscribed: true,
            }),
          });
        } catch (emailError) {
          console.error(`[ADJUST-BILLING] Failed to send notification to ${subscriber.email}:`, emailError);
        }

        adjustments.push({
          email: subscriber.email,
          status: 'adjusted',
          old_amount: currentAmount,
          new_amount: currentMonthlyAmount,
          property_count: currentPropertyCount,
        });

      } catch (error) {
        console.error(`[ADJUST-BILLING] Failed to adjust billing for ${subscriber.email}:`, error);
        adjustments.push({
          email: subscriber.email,
          status: 'failed',
          error: error.message,
        });
      }
    }

    console.log(`[ADJUST-BILLING] Processed ${adjustments.length} billing adjustments`);

    return new Response(
      JSON.stringify({
        success: true,
        adjustments_processed: adjustments.length,
        details: adjustments,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[ADJUST-BILLING] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
