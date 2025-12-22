import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AUDIT FUNCTION: Monthly Billing Adjustment Check
 * 
 * This function audits active subscriptions to verify billing amounts match property counts.
 * It does NOT make changes to Stripe subscriptions - use fix-subscription-billing for repairs.
 * 
 * For metered subscriptions, billing is handled automatically via usage records.
 * This function helps identify any subscriptions that may need migration to metered billing.
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

    console.log("[ADJUST-BILLING] Starting subscription audit (read-only)");

    // Get all active subscriptions
    const { data: activeSubscriptions, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, email, active_properties_count, stripe_subscription_id, stripe_customer_id, organization_id")
      .eq("subscribed", true)
      .eq("is_cancelled", false)
      .not("stripe_subscription_id", "is", null);

    if (fetchError) {
      console.error("[ADJUST-BILLING] Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`[ADJUST-BILLING] Found ${activeSubscriptions?.length || 0} active subscriptions to audit`);

    const auditResults = [];

    for (const subscriber of activeSubscriptions || []) {
      try {
        const currentPropertyCount = subscriber.active_properties_count || 0;
        const expectedMonthlyAmount = currentPropertyCount * 29;

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriber.stripe_subscription_id);
        
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          auditResults.push({
            email: subscriber.email,
            organization_id: subscriber.organization_id,
            status: 'inactive_subscription',
            stripe_status: subscription.status,
            property_count: currentPropertyCount,
            note: 'Subscription not active in Stripe'
          });
          continue;
        }

        // Check if this is a metered subscription
        const subscriptionItem = subscription.items.data[0];
        const isMetered = subscriptionItem?.price?.recurring?.usage_type === 'metered';
        
        if (isMetered) {
          auditResults.push({
            email: subscriber.email,
            organization_id: subscriber.organization_id,
            status: 'metered_ok',
            property_count: currentPropertyCount,
            expected_amount: expectedMonthlyAmount,
            is_metered: true,
            note: 'Metered subscription - billing handled via usage records'
          });
        } else {
          // Fixed-price subscription - needs migration
          const currentAmount = (subscriptionItem?.price?.unit_amount || 0) / 100;
          const billingMatches = currentAmount === expectedMonthlyAmount;
          
          auditResults.push({
            email: subscriber.email,
            organization_id: subscriber.organization_id,
            status: billingMatches ? 'fixed_price_matches' : 'fixed_price_mismatch',
            property_count: currentPropertyCount,
            current_amount: currentAmount,
            expected_amount: expectedMonthlyAmount,
            is_metered: false,
            needs_migration: true,
            note: 'Fixed-price subscription - should migrate to metered billing'
          });
        }

      } catch (error) {
        console.error(`[ADJUST-BILLING] Failed to audit ${subscriber.email}:`, error);
        auditResults.push({
          email: subscriber.email,
          organization_id: subscriber.organization_id,
          status: 'error',
          error: error.message,
        });
      }
    }

    // Summary statistics
    const summary = {
      total: auditResults.length,
      metered_ok: auditResults.filter(r => r.status === 'metered_ok').length,
      fixed_price_matches: auditResults.filter(r => r.status === 'fixed_price_matches').length,
      fixed_price_mismatch: auditResults.filter(r => r.status === 'fixed_price_mismatch').length,
      needs_migration: auditResults.filter(r => r.needs_migration).length,
      inactive: auditResults.filter(r => r.status === 'inactive_subscription').length,
      errors: auditResults.filter(r => r.status === 'error').length,
    };

    console.log(`[ADJUST-BILLING] Audit complete:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        details: auditResults,
        note: "This is a read-only audit. Use fix-subscription-billing to repair issues."
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
