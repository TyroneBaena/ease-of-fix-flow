
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  plan: "starter" | "pro";
  interval: "month" | "year";
};

const PRICES_AUD: Record<Body["plan"], { month: number; year: number; name: string }> = {
  starter: { month: 4900, year: 49000, name: "Starter" },
  pro: { month: 9900, year: 99000, name: "Pro" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const applicationUrl = Deno.env.get("APPLICATION_URL") || "https://housinghub.app";

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("No authenticated user or email missing");

    const { plan, interval } = (await req.json()) as Body;
    if (!plan || !interval) throw new Error("Missing plan or interval");
    if (!(plan in PRICES_AUD)) throw new Error("Invalid plan");
    if (!["month", "year"].includes(interval)) throw new Error("Invalid interval");

    const amount = PRICES_AUD[plan][interval];
    const productName = `${PRICES_AUD[plan].name} (${interval === "month" ? "Monthly" : "Yearly"})`;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Try to find an existing customer
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const origin = req.headers.get("origin") || applicationUrl || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: { name: productName },
            unit_amount: amount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
