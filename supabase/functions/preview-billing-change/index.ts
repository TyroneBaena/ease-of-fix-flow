import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[PREVIEW-BILLING-CHANGE] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newPropertyCount } = await req.json();
    
    if (typeof newPropertyCount !== 'number' || newPropertyCount < 0) {
      throw new Error('Invalid property count');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const stripe = new Stripe(stripeKey, { 
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient()
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    log('Previewing billing change', { userId: user.id, newPropertyCount });

    // Get subscriber
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscriber) {
      throw new Error('Subscriber not found');
    }

    const currentCount = subscriber.active_properties_count || 0;
    const currentMonthly = currentCount * 29;
    const newMonthly = newPropertyCount * 29;
    const difference = newMonthly - currentMonthly;

    // If no subscription, just show the calculation
    if (!subscriber.stripe_subscription_id) {
      return new Response(
        JSON.stringify({
          success: true,
          current_count: currentCount,
          new_count: newPropertyCount,
          current_monthly: currentMonthly,
          new_monthly: newMonthly,
          difference: difference,
          currency: 'AUD',
          has_subscription: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get upcoming invoice preview from Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(
        subscriber.stripe_subscription_id
      );

      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: subscriber.stripe_customer_id!,
        subscription: subscriber.stripe_subscription_id
      });

      // Calculate prorated amount
      const daysInPeriod = Math.ceil(
        (subscription.current_period_end - subscription.current_period_start) / 86400
      );
      const daysRemaining = Math.ceil(
        (subscription.current_period_end - Math.floor(Date.now() / 1000)) / 86400
      );
      const proratedAmount = (difference * daysRemaining) / daysInPeriod;

      log('Billing preview calculated', {
        currentCount,
        newPropertyCount,
        difference,
        proratedAmount,
        daysRemaining,
        daysInPeriod
      });

      return new Response(
        JSON.stringify({
          success: true,
          current_count: currentCount,
          new_count: newPropertyCount,
          current_monthly: currentMonthly,
          new_monthly: newMonthly,
          difference: difference,
          prorated_amount: Math.round(proratedAmount * 100) / 100,
          days_remaining: daysRemaining,
          next_invoice_date: new Date(subscription.current_period_end * 1000).toISOString(),
          next_invoice_total: upcomingInvoice.total / 100,
          currency: 'AUD',
          has_subscription: true,
          action: difference > 0 ? 'charge' : difference < 0 ? 'credit' : 'no_change'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (stripeError: any) {
      log('Stripe error', stripeError.message);
      throw new Error(`Failed to preview invoice: ${stripeError.message}`);
    }

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
