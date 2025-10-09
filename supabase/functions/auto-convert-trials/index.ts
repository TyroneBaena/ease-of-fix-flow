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

    console.log("[AUTO-CONVERT-TRIALS] Starting automatic trial conversion check");

    const now = new Date();
    
    // Get all trials that ended today or earlier and haven't been converted
    // CRITICAL: Only select trials WITH payment methods to prevent failed conversions
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, email, trial_end_date, active_properties_count, stripe_customer_id, payment_method_id")
      .eq("is_trial_active", true)
      .eq("subscribed", false)
      .eq("is_cancelled", false)
      .not("trial_end_date", "is", null)
      .not("payment_method_id", "is", null) // MUST have payment method
      .not("stripe_customer_id", "is", null) // MUST have Stripe customer
      .lte("trial_end_date", now.toISOString());

    if (fetchError) {
      console.error("[AUTO-CONVERT-TRIALS] Error fetching expired trials:", fetchError);
      throw fetchError;
    }

    console.log(`[AUTO-CONVERT-TRIALS] Found ${expiredTrials?.length || 0} trials to convert`);

    const conversions = [];

    for (const trial of expiredTrials || []) {
      console.log(`[AUTO-CONVERT-TRIALS] Processing trial for user ${trial.email}`);
      
      try {
        // VALIDATION: Ensure payment method exists (double-check from query)
        if (!trial.payment_method_id || !trial.stripe_customer_id) {
          console.error(`[AUTO-CONVERT-TRIALS] User ${trial.email} missing payment method or customer ID, skipping`);
          conversions.push({
            email: trial.email,
            status: 'failed',
            error: 'Missing payment method or Stripe customer',
          });
          continue;
        }

        const propertyCount = trial.active_properties_count || 0;
        const monthlyAmount = propertyCount * 29; // $29 per property

        if (propertyCount === 0) {
          console.log(`[AUTO-CONVERT-TRIALS] User ${trial.email} has no properties, marking trial as ended`);
          
          // Just mark trial as ended, don't create subscription
          await supabase
            .from("subscribers")
            .update({
              is_trial_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", trial.user_id);
          
          conversions.push({
            email: trial.email,
            status: 'trial_ended_no_properties',
            property_count: 0,
          });
          continue;
        }

        // Create or get reusable Stripe product for property management
        let product;
        const existingProducts = await stripe.products.list({
          limit: 1,
          active: true,
        });
        
        // Reuse existing product or create new one
        if (existingProducts.data.length > 0 && existingProducts.data[0].name === 'Property Management') {
          product = existingProducts.data[0];
          console.log(`[AUTO-CONVERT-TRIALS] Reusing existing product ${product.id}`);
        } else {
          product = await stripe.products.create({
            name: 'Property Management',
            description: 'Monthly subscription based on number of managed properties',
            metadata: {
              type: 'property_management',
            },
          });
          console.log(`[AUTO-CONVERT-TRIALS] Created new product ${product.id}`);
        }

        // Create metered price for usage-based billing
        const price = await stripe.prices.create({
          product: product.id,
          currency: "aud",
          recurring: {
            interval: "month",
            usage_type: "metered", // Enables usage-based billing
            aggregate_usage: "last_during_period", // Use last reported value
          },
          billing_scheme: "per_unit",
          unit_amount: 2900, // $29 per property in cents
          metadata: {
            type: 'property_count_metered',
          },
        });

        // Create metered subscription
        const subscription = await stripe.subscriptions.create({
          customer: trial.stripe_customer_id,
          items: [{ price: price.id }],
          default_payment_method: trial.payment_method_id,
          collection_method: 'charge_automatically',
          metadata: {
            user_id: trial.user_id,
            property_count: propertyCount.toString(),
            converted_from_trial: 'true',
          },
        });

        // Report initial usage for the current property count
        if (subscription.items.data.length > 0) {
          const subscriptionItemId = subscription.items.data[0].id;
          await stripe.subscriptionItems.createUsageRecord(
            subscriptionItemId,
            {
              quantity: propertyCount,
              timestamp: Math.floor(Date.now() / 1000),
              action: 'set',
            }
          );
          console.log(`[AUTO-CONVERT-TRIALS] Reported initial usage: ${propertyCount} properties`);
        }

        console.log(`[AUTO-CONVERT-TRIALS] Created subscription ${subscription.id} for user ${trial.email}`);

        // Calculate billing dates
        const currentPeriodStart = new Date(subscription.current_period_start * 1000);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        // Update subscriber record
        await supabase
          .from("subscribers")
          .update({
            is_trial_active: false,
            subscribed: true,
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            last_billing_date: currentPeriodStart.toISOString(),
            next_billing_date: currentPeriodEnd.toISOString(),
            payment_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", trial.user_id);

        // Send confirmation email
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-upgrade-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              recipient_email: trial.email,
              recipient_name: trial.email.split('@')[0],
              property_count: propertyCount,
              monthly_amount: monthlyAmount,
            }),
          });
        } catch (emailError) {
          console.error(`[AUTO-CONVERT-TRIALS] Failed to send email to ${trial.email}:`, emailError);
        }

        conversions.push({
          email: trial.email,
          status: 'converted',
          property_count: propertyCount,
          monthly_amount: monthlyAmount,
          subscription_id: subscription.id,
        });

      } catch (error) {
        console.error(`[AUTO-CONVERT-TRIALS] Failed to convert trial for ${trial.email}:`, error);
        conversions.push({
          email: trial.email,
          status: 'failed',
          error: error.message,
        });
      }
    }

    console.log(`[AUTO-CONVERT-TRIALS] Processed ${conversions.length} trial conversions`);

    return new Response(
      JSON.stringify({
        success: true,
        conversions_processed: conversions.length,
        details: conversions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[AUTO-CONVERT-TRIALS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
