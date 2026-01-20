import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Stripe Webhook Diagnostic Function
 * 
 * This function provides visibility into Stripe webhook configuration and health:
 * 1. Checks if required environment variables are set
 * 2. Lists registered webhook endpoints from Stripe
 * 3. Returns status of each endpoint (enabled, disabled)
 * 4. Admin-only access (requires authentication)
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const diagnosticResults: {
    timestamp: string;
    environmentVariables: {
      STRIPE_SECRET_KEY: boolean;
      STRIPE_WEBHOOK_SECRET: boolean;
      SUPABASE_URL: boolean;
      SUPABASE_SERVICE_ROLE_KEY: boolean;
    };
    webhookEndpoints: Array<{
      id: string;
      url: string;
      status: string;
      enabledEvents: string[];
      created: string;
      livemode: boolean;
    }>;
    recentEvents: Array<{
      id: string;
      type: string;
      created: string;
      pending_webhooks: number;
    }>;
    errors: string[];
    recommendations: string[];
  } = {
    timestamp: new Date().toISOString(),
    environmentVariables: {
      STRIPE_SECRET_KEY: false,
      STRIPE_WEBHOOK_SECRET: false,
      SUPABASE_URL: false,
      SUPABASE_SERVICE_ROLE_KEY: false,
    },
    webhookEndpoints: [],
    recentEvents: [],
    errors: [],
    recommendations: [],
  };

  try {
    // Check environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    diagnosticResults.environmentVariables = {
      STRIPE_SECRET_KEY: !!stripeSecretKey,
      STRIPE_WEBHOOK_SECRET: !!stripeWebhookSecret,
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceRoleKey,
    };

    // Add recommendations based on missing env vars
    if (!stripeSecretKey) {
      diagnosticResults.errors.push("STRIPE_SECRET_KEY is not set");
      diagnosticResults.recommendations.push("Add STRIPE_SECRET_KEY to your Supabase Edge Function secrets");
    }
    if (!stripeWebhookSecret) {
      diagnosticResults.errors.push("STRIPE_WEBHOOK_SECRET is not set");
      diagnosticResults.recommendations.push("Add STRIPE_WEBHOOK_SECRET to your Supabase Edge Function secrets - this is required to verify webhook signatures");
    }

    // Verify authentication (admin only)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({
        ...diagnosticResults,
        error: "Supabase environment variables not configured",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user role
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

    // If Stripe key is available, fetch webhook information
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2023-10-16",
      });

      try {
        // List webhook endpoints
        const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
        
        diagnosticResults.webhookEndpoints = webhookEndpoints.data.map((endpoint) => ({
          id: endpoint.id,
          url: endpoint.url,
          status: endpoint.status,
          enabledEvents: endpoint.enabled_events,
          created: new Date(endpoint.created * 1000).toISOString(),
          livemode: endpoint.livemode,
        }));

        // Check for common issues
        if (webhookEndpoints.data.length === 0) {
          diagnosticResults.recommendations.push(
            "No webhook endpoints found. Create a webhook endpoint in Stripe Dashboard pointing to your stripe-webhook edge function URL"
          );
        }

        // Check if any endpoint points to Supabase functions
        const supabaseEndpoints = webhookEndpoints.data.filter(
          (ep) => ep.url.includes("supabase") || ep.url.includes("functions")
        );
        
        if (supabaseEndpoints.length === 0 && webhookEndpoints.data.length > 0) {
          diagnosticResults.recommendations.push(
            "No webhook endpoints pointing to Supabase functions detected. Ensure your webhook URL is configured correctly."
          );
        }

        // Check for disabled endpoints
        const disabledEndpoints = webhookEndpoints.data.filter((ep) => ep.status === "disabled");
        if (disabledEndpoints.length > 0) {
          diagnosticResults.errors.push(`${disabledEndpoints.length} webhook endpoint(s) are disabled`);
          diagnosticResults.recommendations.push("Enable disabled webhook endpoints in Stripe Dashboard");
        }

        // Fetch recent events (to show if Stripe is generating events)
        const recentEvents = await stripe.events.list({ limit: 10 });
        
        diagnosticResults.recentEvents = recentEvents.data.map((event) => ({
          id: event.id,
          type: event.type,
          created: new Date(event.created * 1000).toISOString(),
          pending_webhooks: event.pending_webhooks,
        }));

        // Check for events with pending webhooks
        const pendingEvents = recentEvents.data.filter((e) => e.pending_webhooks > 0);
        if (pendingEvents.length > 0) {
          diagnosticResults.recommendations.push(
            `${pendingEvents.length} recent event(s) have pending webhook deliveries. This may indicate webhook delivery issues.`
          );
        }

      } catch (stripeError) {
        diagnosticResults.errors.push(`Stripe API error: ${stripeError.message}`);
      }
    }

    // Add final recommendations
    if (diagnosticResults.errors.length === 0 && diagnosticResults.webhookEndpoints.length > 0) {
      diagnosticResults.recommendations.push("Webhook configuration appears healthy. Monitor Stripe Dashboard for delivery issues.");
    }

    return new Response(JSON.stringify(diagnosticResults), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook diagnostic error:", error);
    diagnosticResults.errors.push(`Unexpected error: ${error.message}`);
    
    return new Response(JSON.stringify(diagnosticResults), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
