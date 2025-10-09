import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => {
  console.log(`[GET-INVOICE-HISTORY] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    log('Fetching invoice history', { userId: user.id });

    // Get subscriber
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscriber || !subscriber.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          success: true,
          invoices: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscriber.stripe_customer_id,
      limit: 100
    });

    log('Found invoices', { count: invoices.data.length });

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      date: new Date(invoice.created * 1000).toISOString(),
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      amount: invoice.total / 100,
      amount_paid: invoice.amount_paid / 100,
      amount_due: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      paid: invoice.paid,
      pdf_url: invoice.invoice_pdf,
      hosted_url: invoice.hosted_invoice_url,
      description: invoice.description || `Invoice for ${new Date(invoice.created * 1000).toLocaleDateString()}`,
      line_items: invoice.lines.data.map(item => ({
        description: item.description,
        amount: item.amount / 100,
        quantity: item.quantity,
        period_start: item.period?.start ? new Date(item.period.start * 1000).toISOString() : null,
        period_end: item.period?.end ? new Date(item.period.end * 1000).toISOString() : null
      }))
    }));

    return new Response(
      JSON.stringify({
        success: true,
        invoices: formattedInvoices
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
