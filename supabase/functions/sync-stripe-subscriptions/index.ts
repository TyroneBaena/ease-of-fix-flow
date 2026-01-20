import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sync Stripe Subscriptions Function
 * 
 * This function acts as a safety net for webhook failures by:
 * 1. Querying all subscribers with Stripe subscription IDs
 * 2. Fetching the actual status from Stripe
 * 3. Correcting any inconsistencies in the database
 * 
 * Designed to be run daily via cron job
 */

interface SyncResult {
  timestamp: string;
  totalProcessed: number;
  corrections: Array<{
    subscriberId: string;
    organizationId: string;
    stripeSubscriptionId: string;
    issue: string;
    previousState: Record<string, unknown>;
    newState: Record<string, unknown>;
  }>;
  errors: Array<{
    subscriberId: string;
    error: string;
  }>;
  skipped: number;
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const syncResult: SyncResult = {
    timestamp: new Date().toISOString(),
    totalProcessed: 0,
    corrections: [],
    errors: [],
    skipped: 0,
    summary: "",
  };

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({
        error: "Missing required environment variables",
        missing: {
          STRIPE_SECRET_KEY: !stripeSecretKey,
          SUPABASE_URL: !supabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: !supabaseServiceRoleKey,
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Optional: Verify auth for manual invocations (skip for scheduled runs)
    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const isScheduled = body.scheduled === true;

    if (!isScheduled && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check user role for manual runs
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("🔄 Starting Stripe subscription sync...");

    // Fetch all subscribers with Stripe subscription IDs
    const { data: subscribers, error: fetchError } = await supabaseAdmin
      .from("subscribers")
      .select(`
        id,
        organization_id,
        stripe_subscription_id,
        subscribed,
        is_cancelled,
        cancellation_date,
        subscription_status,
        is_trial_active
      `)
      .not("stripe_subscription_id", "is", null);

    if (fetchError) {
      console.error("Error fetching subscribers:", fetchError);
      return new Response(JSON.stringify({
        error: "Failed to fetch subscribers",
        details: fetchError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscribers || subscribers.length === 0) {
      syncResult.summary = "No subscribers with Stripe subscriptions found";
      return new Response(JSON.stringify(syncResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📊 Found ${subscribers.length} subscribers with Stripe subscriptions`);

    // Process each subscriber
    for (const sub of subscribers) {
      syncResult.totalProcessed++;

      try {
        // Skip if no stripe subscription ID (shouldn't happen due to query filter, but safety check)
        if (!sub.stripe_subscription_id) {
          syncResult.skipped++;
          continue;
        }

        // Fetch subscription from Stripe
        let stripeSubscription: Stripe.Subscription;
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        } catch (stripeError: any) {
          // Handle deleted/not found subscriptions
          if (stripeError.code === "resource_missing") {
            console.log(`⚠️ Subscription ${sub.stripe_subscription_id} not found in Stripe (may be deleted)`);
            
            // If DB shows active but Stripe says deleted, mark as cancelled
            if (sub.subscribed && !sub.is_cancelled) {
              const { error: updateError } = await supabaseAdmin
                .from("subscribers")
                .update({
                  subscribed: false,
                  is_cancelled: true,
                  subscription_status: "deleted",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", sub.id);

              if (!updateError) {
                syncResult.corrections.push({
                  subscriberId: sub.id,
                  organizationId: sub.organization_id,
                  stripeSubscriptionId: sub.stripe_subscription_id,
                  issue: "Subscription deleted in Stripe but marked active in DB",
                  previousState: { subscribed: sub.subscribed, is_cancelled: sub.is_cancelled },
                  newState: { subscribed: false, is_cancelled: true, subscription_status: "deleted" },
                });
              }
            }
            continue;
          }
          throw stripeError;
        }

        const stripeStatus = stripeSubscription.status;
        const isStripeActive = stripeStatus === "active" || stripeStatus === "trialing";
        const isStripeCanceled = stripeStatus === "canceled";

        // Check for inconsistencies and fix them

        // Case 1: Stripe is active but DB shows cancelled
        if (isStripeActive && sub.is_cancelled) {
          console.log(`🔧 Fixing: Subscriber ${sub.id} - Stripe active but DB shows cancelled`);
          
          const { error: updateError } = await supabaseAdmin
            .from("subscribers")
            .update({
              subscribed: true,
              is_cancelled: false,
              cancellation_date: null,
              subscription_status: stripeStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          if (!updateError) {
            syncResult.corrections.push({
              subscriberId: sub.id,
              organizationId: sub.organization_id,
              stripeSubscriptionId: sub.stripe_subscription_id,
              issue: "Stripe subscription is active but DB marked as cancelled",
              previousState: {
                subscribed: sub.subscribed,
                is_cancelled: sub.is_cancelled,
                subscription_status: sub.subscription_status,
              },
              newState: {
                subscribed: true,
                is_cancelled: false,
                cancellation_date: null,
                subscription_status: stripeStatus,
              },
            });
          } else {
            syncResult.errors.push({
              subscriberId: sub.id,
              error: `Failed to update: ${updateError.message}`,
            });
          }
        }

        // Case 2: Stripe is active but DB shows not subscribed
        else if (isStripeActive && !sub.subscribed) {
          console.log(`🔧 Fixing: Subscriber ${sub.id} - Stripe active but DB shows not subscribed`);
          
          const { error: updateError } = await supabaseAdmin
            .from("subscribers")
            .update({
              subscribed: true,
              is_cancelled: false,
              cancellation_date: null,
              subscription_status: stripeStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          if (!updateError) {
            syncResult.corrections.push({
              subscriberId: sub.id,
              organizationId: sub.organization_id,
              stripeSubscriptionId: sub.stripe_subscription_id,
              issue: "Stripe subscription is active but DB shows not subscribed",
              previousState: {
                subscribed: sub.subscribed,
                is_cancelled: sub.is_cancelled,
              },
              newState: {
                subscribed: true,
                is_cancelled: false,
                subscription_status: stripeStatus,
              },
            });
          } else {
            syncResult.errors.push({
              subscriberId: sub.id,
              error: `Failed to update: ${updateError.message}`,
            });
          }
        }

        // Case 3: Stripe is canceled but DB shows active
        else if (isStripeCanceled && sub.subscribed && !sub.is_cancelled) {
          console.log(`🔧 Fixing: Subscriber ${sub.id} - Stripe cancelled but DB shows active`);
          
          const { error: updateError } = await supabaseAdmin
            .from("subscribers")
            .update({
              subscribed: false,
              is_cancelled: true,
              subscription_status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          if (!updateError) {
            syncResult.corrections.push({
              subscriberId: sub.id,
              organizationId: sub.organization_id,
              stripeSubscriptionId: sub.stripe_subscription_id,
              issue: "Stripe subscription is canceled but DB shows active",
              previousState: {
                subscribed: sub.subscribed,
                is_cancelled: sub.is_cancelled,
              },
              newState: {
                subscribed: false,
                is_cancelled: true,
                subscription_status: "canceled",
              },
            });
          } else {
            syncResult.errors.push({
              subscriberId: sub.id,
              error: `Failed to update: ${updateError.message}`,
            });
          }
        }

        // Case 4: subscription_status doesn't match Stripe status
        else if (sub.subscription_status !== stripeStatus) {
          console.log(`🔧 Fixing: Subscriber ${sub.id} - Status mismatch: DB=${sub.subscription_status}, Stripe=${stripeStatus}`);
          
          const { error: updateError } = await supabaseAdmin
            .from("subscribers")
            .update({
              subscription_status: stripeStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          if (!updateError) {
            syncResult.corrections.push({
              subscriberId: sub.id,
              organizationId: sub.organization_id,
              stripeSubscriptionId: sub.stripe_subscription_id,
              issue: `Status mismatch: DB had '${sub.subscription_status}' but Stripe has '${stripeStatus}'`,
              previousState: { subscription_status: sub.subscription_status },
              newState: { subscription_status: stripeStatus },
            });
          } else {
            syncResult.errors.push({
              subscriberId: sub.id,
              error: `Failed to update status: ${updateError.message}`,
            });
          }
        }

      } catch (error: any) {
        console.error(`Error processing subscriber ${sub.id}:`, error);
        syncResult.errors.push({
          subscriberId: sub.id,
          error: error.message || "Unknown error",
        });
      }
    }

    // Generate summary
    syncResult.summary = `Processed ${syncResult.totalProcessed} subscribers. ` +
      `Made ${syncResult.corrections.length} correction(s). ` +
      `${syncResult.errors.length} error(s). ` +
      `${syncResult.skipped} skipped.`;

    console.log(`✅ Sync complete: ${syncResult.summary}`);

    return new Response(JSON.stringify(syncResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Sync function error:", error);
    syncResult.summary = `Sync failed: ${error.message}`;
    
    return new Response(JSON.stringify(syncResult), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
