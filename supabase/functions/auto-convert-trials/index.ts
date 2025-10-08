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
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, email, trial_end_date, active_properties_count, stripe_customer_id, payment_method_id")
      .eq("is_trial_active", true)
      .eq("subscribed", false)
      .eq("is_cancelled", false)
      .not("trial_end_date", "is", null)
      .not("payment_method_id", "is", null)
      .lte("trial_end_date", now.toISOString());

    if (fetchError) {
      console.error("[AUTO-CONVERT-TRIALS] Error fetching expired trials:", fetchError);
      throw fetchError;
    }

    console.log(`[AUTO-CONVERT-TRIALS] Found ${expiredTrials?.length || 0} trials to convert`);

    const conversions = [];

    for (const trial of expiredTrials || []) {
      console.log(`[AUTO-CONVERT-TRIALS] Converting trial for user ${trial.email}`);
      
      try {
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

        // Create Stripe product and price
        const product = await stripe.products.create({
          name: `Property Management - ${propertyCount} ${propertyCount === 1 ? 'Property' : 'Properties'}`,
          description: `Subscription for ${propertyCount} managed ${propertyCount === 1 ? 'property' : 'properties'}`,
          metadata: {
            user_id: trial.user_id,
            property_count: propertyCount.toString(),
          },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: monthlyAmount * 100, // Convert to cents
          currency: "aud",
          recurring: {
            interval: "month",
          },
          metadata: {
            user_id: trial.user_id,
            property_count: propertyCount.toString(),
          },
        });

        // Create subscription
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
