import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (message: string, data?: any) => {
  console.log(`[stripe-webhook] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey || !webhookSecret) {
      log('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Stripe configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      log('No Stripe signature found');
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      log('Webhook signature verified', { type: event.type });
    } catch (err) {
      log('Webhook signature verification failed', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        log('Processing subscription event', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });

        const { error } = await supabase
          .from('subscribers')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscribed: subscription.status === 'active',
            is_trial_active: subscription.status === 'trialing',
            trial_end_date: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            payment_status: 'active',
            failed_payment_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer);

        if (error) {
          log('Error updating subscriber for subscription event', error);
        } else {
          log('Subscriber updated successfully for subscription event');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        log('Processing subscription deletion', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        });

        const { error } = await supabase
          .from('subscribers')
          .update({
            subscribed: false,
            is_trial_active: false,
            subscription_status: 'canceled',
            is_cancelled: true,
            cancellation_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer);

        if (error) {
          log('Error updating subscriber for subscription deletion', error);
        } else {
          log('Subscriber updated successfully for subscription deletion');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        log('Processing successful payment', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid,
        });

        const { error } = await supabase
          .from('subscribers')
          .update({
            payment_status: 'active',
            failed_payment_count: 0,
            last_payment_attempt: new Date().toISOString(),
            last_billing_date: new Date().toISOString(),
            next_billing_date: invoice.period_end 
              ? new Date(invoice.period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer);

        if (error) {
          log('Error updating subscriber for successful payment', error);
        } else {
          log('Subscriber updated successfully for successful payment');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        log('Processing failed payment', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count,
        });

        // Get current failed payment count
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('failed_payment_count')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        const currentFailedCount = subscriber?.failed_payment_count || 0;

        const { error } = await supabase
          .from('subscribers')
          .update({
            payment_status: 'past_due',
            failed_payment_count: currentFailedCount + 1,
            last_payment_attempt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer);

        if (error) {
          log('Error updating subscriber for failed payment', error);
        } else {
          log('Subscriber updated successfully for failed payment');
        }
        break;
      }

      case 'invoice.upcoming': {
        const invoice = event.data.object as Stripe.Invoice;
        log('Upcoming invoice notification', {
          customerId: invoice.customer,
          amount: invoice.amount_due,
          dueDate: invoice.due_date,
        });
        
        // This event can be used to send reminder emails
        // Implementation for email reminders will come in Phase 6
        break;
      }

      default:
        log('Unhandled event type', { type: event.type });
    }

    // Return success response
    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    log('Error processing webhook', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
