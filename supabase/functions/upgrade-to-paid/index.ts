import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Invalid authorization");
    }

    console.log(`[UPGRADE-TO-PAID] Starting upgrade for user: ${user.id}`);

    // Get subscriber record
    const { data: subscriber, error: subError } = await supabase
      .from("subscribers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscriber) {
      throw new Error("Subscriber not found");
    }

    // Verify payment method exists
    if (!subscriber.payment_method_id) {
      throw new Error("No payment method on file. Please add a payment method first.");
    }

    // Count active properties
    const { count: propertyCount, error: propError } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (propError) {
      throw new Error("Failed to count properties");
    }

    if (!propertyCount || propertyCount === 0) {
      throw new Error("You must have at least one property to upgrade to a paid subscription");
    }

    console.log(`[UPGRADE-TO-PAID] Property count: ${propertyCount}`);

    // Calculate monthly amount ($29 AUD per property)
    const monthlyAmount = propertyCount * 29;

    // Create or get Stripe customer
    let stripeCustomerId = subscriber.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        payment_method: subscriber.payment_method_id,
        invoice_settings: {
          default_payment_method: subscriber.payment_method_id,
        },
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
      console.log(`[UPGRADE-TO-PAID] Created Stripe customer: ${stripeCustomerId}`);
    } else {
      // Attach payment method to existing customer
      await stripe.paymentMethods.attach(subscriber.payment_method_id, {
        customer: stripeCustomerId,
      });
      
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: subscriber.payment_method_id,
        },
      });
      console.log(`[UPGRADE-TO-PAID] Updated existing customer: ${stripeCustomerId}`);
    }

    // Create Stripe product for this subscription
    const product = await stripe.products.create({
      name: `Property Management - ${propertyCount} ${propertyCount === 1 ? 'Property' : 'Properties'}`,
      metadata: {
        user_id: user.id,
        property_count: propertyCount.toString(),
      },
    });

    console.log(`[UPGRADE-TO-PAID] Created product: ${product.id}`);

    // Create price in AUD
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: monthlyAmount * 100, // Convert to cents
      currency: "aud",
      recurring: {
        interval: "month",
      },
      metadata: {
        user_id: user.id,
        property_count: propertyCount.toString(),
      },
    });

    console.log(`[UPGRADE-TO-PAID] Created price: ${price.id} for $${monthlyAmount} AUD`);

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: price.id }],
      default_payment_method: subscriber.payment_method_id,
      metadata: {
        user_id: user.id,
        property_count: propertyCount.toString(),
      },
      billing_cycle_anchor_config: {
        day_of_month: new Date().getDate(),
      },
    });

    console.log(`[UPGRADE-TO-PAID] Created subscription: ${subscription.id}`);

    // Calculate next billing date (1 month from now)
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // Update subscriber record
    const { error: updateError } = await supabase
      .from("subscribers")
      .update({
        subscribed: true,
        is_trial_active: false,
        subscription_status: "active",
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        active_properties_count: propertyCount,
        next_billing_date: nextBillingDate.toISOString(),
        last_billing_date: new Date().toISOString(),
        payment_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[UPGRADE-TO-PAID] Failed to update subscriber:", updateError);
      throw new Error("Failed to update subscription status");
    }

    console.log(`[UPGRADE-TO-PAID] Successfully upgraded user ${user.id} to paid subscription`);

    // Send confirmation email
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-upgrade-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          recipient_email: user.email,
          recipient_name: user.user_metadata?.name || user.email?.split('@')[0],
          property_count: propertyCount,
          monthly_amount: monthlyAmount,
          next_billing_date: nextBillingDate.toISOString(),
        }),
      });
    } catch (emailError) {
      console.error("[UPGRADE-TO-PAID] Failed to send confirmation email:", emailError);
      // Don't fail the whole operation if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscription.id,
        propertyCount,
        monthlyAmount,
        nextBillingDate: nextBillingDate.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[UPGRADE-TO-PAID] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
