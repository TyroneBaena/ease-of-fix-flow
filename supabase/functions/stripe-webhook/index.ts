import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  // Log immediately to confirm webhook is being called
  console.log('[STRIPE-WEBHOOK] ===== Webhook request received =====');
  console.log('[STRIPE-WEBHOOK] Method:', req.method);
  console.log('[STRIPE-WEBHOOK] URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables with detailed logging
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('[STRIPE-WEBHOOK] Environment check:', {
      hasStripeKey: !!stripeSecretKey,
      hasWebhookSecret: !!webhookSecret,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      webhookSecretPrefix: webhookSecret ? webhookSecret.substring(0, 7) + '...' : 'missing'
    });

    if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      const missing = [];
      if (!stripeSecretKey) missing.push('STRIPE_SECRET_KEY');
      if (!webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      
      log('Missing environment variables', { missing });
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature');
    console.log('[STRIPE-WEBHOOK] Signature present:', !!signature);
    console.log('[STRIPE-WEBHOOK] Signature value:', signature?.substring(0, 20) + '...');
    
    if (!signature) {
      log('No signature provided in request');
      throw new Error('No stripe-signature header provided');
    }

    const body = await req.text();
    console.log('[STRIPE-WEBHOOK] Request body length:', body.length);
    
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('[STRIPE-WEBHOOK] ✅ Signature verification successful');
    } catch (err) {
      console.error('[STRIPE-WEBHOOK] ❌ Signature verification failed');
      console.error('[STRIPE-WEBHOOK] Error details:', err);
      console.error('[STRIPE-WEBHOOK] Webhook secret prefix:', webhookSecret.substring(0, 7) + '...');
      
      log('Webhook signature verification failed', { 
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : typeof err
      });
      
      throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    log('Webhook received', { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        log('Payment succeeded', { invoiceId: invoice.id, customerId: invoice.customer });

        if (typeof invoice.customer === 'string') {
          const { data: subscriber } = await supabase
            .from('subscribers')
            .select('*')
            .eq('stripe_customer_id', invoice.customer)
            .single();

          if (subscriber) {
            // CRITICAL: Reset cancellation status when payment succeeds
            await supabase
              .from('subscribers')
              .update({
                payment_status: 'active',
                failed_payment_count: 0,
                last_payment_attempt: new Date().toISOString(),
                last_billing_date: new Date().toISOString(),
                subscribed: true,
                is_cancelled: false,
                cancellation_date: null,
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_customer_id', invoice.customer);

            log('Updated subscriber after successful payment', { 
              subscriberId: subscriber.id,
              resetCancellation: true 
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        log('Payment failed', { invoiceId: invoice.id, customerId: invoice.customer });

        if (typeof invoice.customer === 'string') {
          const { data: subscriber } = await supabase
            .from('subscribers')
            .select('failed_payment_count')
            .eq('stripe_customer_id', invoice.customer)
            .single();

          if (subscriber) {
            const newFailedCount = (subscriber.failed_payment_count || 0) + 1;
            
            await supabase
              .from('subscribers')
              .update({
                payment_status: 'failed',
                failed_payment_count: newFailedCount,
                last_payment_attempt: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_customer_id', invoice.customer);

            log('Updated subscriber after failed payment', { failedCount: newFailedCount });

            // If 3rd failed payment, pause subscription and set grace period
            if (newFailedCount >= 3) {
              try {
                if (typeof invoice.subscription === 'string') {
                  await stripe.subscriptions.update(invoice.subscription, {
                    pause_collection: { behavior: 'void' }
                  });
                  log('Paused subscription after 3 failed payments');
                }
              } catch (pauseError) {
                log('Error pausing subscription', { error: pauseError });
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        log('Subscription deleted', { subscriptionId: subscription.id, customerId: subscription.customer });

        if (typeof subscription.customer === 'string') {
          await supabase
            .from('subscribers')
            .update({
              subscribed: false,
              is_cancelled: true,
              cancellation_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', subscription.customer);

          log('Marked subscription as cancelled');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const isActive = subscription.status === 'active';
        log('Subscription updated', { subscriptionId: subscription.id, status: subscription.status, isActive });

        if (typeof subscription.customer === 'string') {
          // CRITICAL: Reset cancellation status when subscription becomes active
          const updateData: Record<string, unknown> = {
            subscribed: isActive,
            subscription_status: subscription.status,
            next_billing_date: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString() 
              : null,
            updated_at: new Date().toISOString(),
          };

          // Only reset cancellation fields if subscription is active
          if (isActive) {
            updateData.is_cancelled = false;
            updateData.cancellation_date = null;
          }

          await supabase
            .from('subscribers')
            .update(updateData)
            .eq('stripe_customer_id', subscription.customer);

          log('Updated subscription status', { isActive, resetCancellation: isActive });
        }
        break;
      }

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        log('Setup intent succeeded', { setupIntentId: setupIntent.id, customerId: setupIntent.customer });

        if (typeof setupIntent.customer === 'string' && setupIntent.payment_method) {
          await supabase
            .from('subscribers')
            .update({
              payment_method_id: typeof setupIntent.payment_method === 'string' 
                ? setupIntent.payment_method 
                : setupIntent.payment_method.id,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', setupIntent.customer);

          log('Saved payment method');
        }
        break;
      }

      default:
        log('Unhandled event type', { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[STRIPE-WEBHOOK] ❌❌❌ Fatal error ❌❌❌');
    console.error('[STRIPE-WEBHOOK] Error message:', errorMessage);
    console.error('[STRIPE-WEBHOOK] Error stack:', errorStack);
    
    log('Webhook fatal error', { 
      error: errorMessage,
      stack: errorStack,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      hint: 'Check edge function logs for details'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
