import Stripe from "https://esm.sh/stripe@13.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(step: string, details?: unknown) {
  console.log(`[CREATE-TRIAL-SUBSCRIPTION] ${step}`, details ? JSON.stringify(details) : '');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Starting trial subscription creation");

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // When verify_jwt = true, the user is automatically authenticated
    // We can access the user via the Supabase client using the auto-passed JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    log("Get user result", { 
      hasUser: !!user, 
      userId: user?.id,
      authErrorMessage: authError?.message 
    });
    
    if (authError || !user) {
      log("Authentication failed", { authError });
      throw new Error('User not authenticated');
    }

    log("User authenticated", { userId: user.id, email: user.email });

    // Create or get Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      log("Found existing Stripe customer", { customerId: customer.id });
    } else {
      customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      log("Created new Stripe customer", { customerId: customer.id });
    }

    // Create SetupIntent for payment method collection
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    log("Created SetupIntent", { setupIntentId: setupIntent.id });

    // Calculate trial end date (30 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    // Count user's active properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id')
      .eq('user_id', user.id);

    if (propertiesError) {
      log("Error fetching properties", { propertiesError });
      throw new Error('Failed to fetch user properties');
    }

    const propertyCount = properties?.length || 0;
    log("Counted user properties", { propertyCount });

    // Create service role client for admin operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert subscriber record
    const { data: subscriber, error: subscriberError } = await adminSupabase
      .from('subscribers')
      .upsert({
        user_id: user.id,
        email: user.email!,
        stripe_customer_id: customer.id,
        setup_intent_id: setupIntent.id,
        trial_start_date: new Date().toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        is_trial_active: true,
        is_cancelled: false,
        active_properties_count: propertyCount,
        subscribed: false,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (subscriberError) {
      log("Error creating subscriber", { subscriberError });
      throw new Error('Failed to create subscriber record');
    }

    log("Created/updated subscriber", { subscriberId: subscriber.id });

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      client_secret: setupIntent.client_secret,
      customer_id: customer.id,
      trial_end_date: trialEndDate.toISOString(),
      property_count: propertyCount,
      return_url: `${supabaseUrl.replace('supabase.co', 'supabase.co')}/billing`,
      cancel_url: `${supabaseUrl.replace('supabase.co', 'supabase.co')}/billing`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log("Error in create-trial-subscription", { error: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});