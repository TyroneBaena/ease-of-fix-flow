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

    console.log(`[CALCULATE-BILLING] Calculating for user: ${user.id}`);

    // Get subscriber record
    const { data: subscriber, error: subError } = await supabase
      .from("subscribers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscriber) {
      throw new Error("Subscriber not found");
    }

    // Count active properties
    const { count: propertyCount, error: propError } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (propError) {
      throw new Error("Failed to count properties");
    }

    const actualPropertyCount = propertyCount || 0;
    const monthlyAmount = actualPropertyCount * 29; // $29 AUD per property

    console.log(`[CALCULATE-BILLING] Properties: ${actualPropertyCount}, Amount: $${monthlyAmount} AUD`);

    // If user has an active subscription, update it
    if (subscriber.subscribed && subscriber.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(subscriber.stripe_subscription_id);
      
      // Only update if property count changed
      if (actualPropertyCount !== subscriber.active_properties_count) {
        console.log(`[CALCULATE-BILLING] Property count changed from ${subscriber.active_properties_count} to ${actualPropertyCount}`);
        
        // Create new product and price for updated property count
        const product = await stripe.products.create({
          name: `Property Management - ${actualPropertyCount} ${actualPropertyCount === 1 ? 'Property' : 'Properties'}`,
          metadata: {
            user_id: user.id,
            property_count: actualPropertyCount.toString(),
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
            user_id: user.id,
            property_count: actualPropertyCount.toString(),
          },
        });

        // Update subscription with new price
        await stripe.subscriptions.update(subscription.id, {
          items: [
            {
              id: subscription.items.data[0].id,
              price: price.id,
            },
          ],
          proration_behavior: 'create_prorations', // Pro-rate the change
          metadata: {
            user_id: user.id,
            property_count: actualPropertyCount.toString(),
          },
        });

        console.log(`[CALCULATE-BILLING] Updated subscription ${subscription.id} with new price`);
      }
    }

    // Update subscriber record with current property count
    const { error: updateError } = await supabase
      .from("subscribers")
      .update({
        active_properties_count: actualPropertyCount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[CALCULATE-BILLING] Failed to update subscriber:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        propertyCount: actualPropertyCount,
        monthlyAmount,
        currency: "AUD",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[CALCULATE-BILLING] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
