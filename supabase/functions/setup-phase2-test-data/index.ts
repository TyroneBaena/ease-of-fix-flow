import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Stripe from 'https://esm.sh/stripe@14.21.0';

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log("[SETUP-TEST-DATA] Starting Phase 2 test data setup with real Stripe integration");

    const testResults = [];

    // ========================================
    // SCENARIO 1: Expired Trial with Payment Method (Auto-Convert Ready)
    // ========================================
    console.log("\n[TEST 1] Creating expired trial with payment method...");
    
    const testEmail1 = `test-autoconvert-${Date.now()}@phase2testing.com`;
    
    // Create Stripe customer
    const customer1 = await stripe.customers.create({
      email: testEmail1,
      name: "Auto Convert Test User",
      description: "Test customer for auto-convert trial functionality",
      metadata: {
        test: 'phase2',
        scenario: 'auto_convert',
      }
    });

    // Create test payment method
    const paymentMethod1 = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa', // Stripe test token
      },
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod1.id, {
      customer: customer1.id,
    });

    // Set as default payment method
    await stripe.customers.update(customer1.id, {
      invoice_settings: {
        default_payment_method: paymentMethod1.id,
      },
    });

    // Create user in auth (mock user_id)
    const testUserId1 = crypto.randomUUID();

    // Create subscriber record with expired trial
    const { error: insertError1 } = await supabase
      .from("subscribers")
      .insert({
        user_id: testUserId1,
        email: testEmail1,
        stripe_customer_id: customer1.id,
        payment_method_id: paymentMethod1.id,
        is_trial_active: true,
        trial_start_date: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 days ago
        trial_end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday (EXPIRED)
        active_properties_count: 3,
        subscribed: false,
        is_cancelled: false,
        subscription_status: 'trialing',
      });

    if (insertError1) throw insertError1;

    testResults.push({
      scenario: "AUTO-CONVERT TEST",
      email: testEmail1,
      stripe_customer_id: customer1.id,
      payment_method_id: paymentMethod1.id,
      trial_end_date: "Yesterday (EXPIRED)",
      properties: 3,
      expected_amount: "$87/month (3 properties × $29)",
      status: "✅ Ready for auto-convert",
    });

    // ========================================
    // SCENARIO 2: Active Subscription with Property Mismatch (Billing Adjustment Ready)
    // ========================================
    console.log("\n[TEST 2] Creating active subscription with property count mismatch...");
    
    const testEmail2 = `test-billing-adjust-${Date.now()}@phase2testing.com`;
    
    // Create Stripe customer
    const customer2 = await stripe.customers.create({
      email: testEmail2,
      name: "Billing Adjustment Test User",
      description: "Test customer for billing adjustment functionality",
      metadata: {
        test: 'phase2',
        scenario: 'billing_adjustment',
      }
    });

    // Create payment method
    const paymentMethod2 = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa',
      },
    });

    await stripe.paymentMethods.attach(paymentMethod2.id, {
      customer: customer2.id,
    });

    await stripe.customers.update(customer2.id, {
      invoice_settings: {
        default_payment_method: paymentMethod2.id,
      },
    });

    // Create product and price for 2 properties ($58/month)
    const product2 = await stripe.products.create({
      name: "Property Management - 2 Properties",
      description: "Test subscription for 2 properties",
      metadata: {
        test: 'phase2',
        property_count: '2',
      }
    });

    const price2 = await stripe.prices.create({
      product: product2.id,
      unit_amount: 5800, // $58 (2 properties × $29)
      currency: "aud",
      recurring: {
        interval: "month",
      },
    });

    // Create active subscription
    const subscription2 = await stripe.subscriptions.create({
      customer: customer2.id,
      items: [{ price: price2.id }],
      default_payment_method: paymentMethod2.id,
      metadata: {
        test: 'phase2',
        property_count: '2',
      }
    });

    const testUserId2 = crypto.randomUUID();

    // Create subscriber with DIFFERENT property count (5 instead of 2) - MISMATCH!
    const { error: insertError2 } = await supabase
      .from("subscribers")
      .insert({
        user_id: testUserId2,
        email: testEmail2,
        stripe_customer_id: customer2.id,
        stripe_subscription_id: subscription2.id,
        payment_method_id: paymentMethod2.id,
        is_trial_active: false,
        subscribed: true,
        is_cancelled: false,
        subscription_status: subscription2.status,
        active_properties_count: 5, // MISMATCH: Subscription is for 2, but we have 5!
        last_billing_date: new Date(subscription2.current_period_start * 1000).toISOString(),
        next_billing_date: new Date(subscription2.current_period_end * 1000).toISOString(),
      });

    if (insertError2) throw insertError2;

    testResults.push({
      scenario: "BILLING ADJUSTMENT TEST",
      email: testEmail2,
      stripe_customer_id: customer2.id,
      stripe_subscription_id: subscription2.id,
      current_stripe_amount: "$58/month (2 properties)",
      actual_properties: 5,
      expected_new_amount: "$145/month (5 properties × $29)",
      adjustment_needed: "+$87/month",
      status: "✅ Ready for billing adjustment",
    });

    // ========================================
    // SCENARIO 3: Trial Ending in 7 Days (Reminder Ready)
    // ========================================
    console.log("\n[TEST 3] Creating trial ending in 7 days...");
    
    const testEmail3 = `test-reminder-7days-${Date.now()}@phase2testing.com`;
    
    const customer3 = await stripe.customers.create({
      email: testEmail3,
      name: "7-Day Reminder Test User",
      metadata: {
        test: 'phase2',
        scenario: 'trial_reminder_7days',
      }
    });

    const testUserId3 = crypto.randomUUID();

    const { error: insertError3 } = await supabase
      .from("subscribers")
      .insert({
        user_id: testUserId3,
        email: testEmail3,
        stripe_customer_id: customer3.id,
        is_trial_active: true,
        trial_start_date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Exactly 7 days
        active_properties_count: 2,
        subscribed: false,
        is_cancelled: false,
        subscription_status: 'trialing',
      });

    if (insertError3) throw insertError3;

    testResults.push({
      scenario: "TRIAL REMINDER - 7 DAYS",
      email: testEmail3,
      stripe_customer_id: customer3.id,
      trial_end_date: "7 days from now",
      properties: 2,
      status: "✅ Ready for 7-day reminder",
    });

    // ========================================
    // SCENARIO 4: Trial Ending in 3 Days (Reminder Ready)
    // ========================================
    console.log("\n[TEST 4] Creating trial ending in 3 days...");
    
    const testEmail4 = `test-reminder-3days-${Date.now()}@phase2testing.com`;
    
    const customer4 = await stripe.customers.create({
      email: testEmail4,
      name: "3-Day Reminder Test User",
      metadata: {
        test: 'phase2',
        scenario: 'trial_reminder_3days',
      }
    });

    const testUserId4 = crypto.randomUUID();

    const { error: insertError4 } = await supabase
      .from("subscribers")
      .insert({
        user_id: testUserId4,
        email: testEmail4,
        stripe_customer_id: customer4.id,
        is_trial_active: true,
        trial_start_date: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Exactly 3 days
        active_properties_count: 1,
        subscribed: false,
        is_cancelled: false,
        subscription_status: 'trialing',
      });

    if (insertError4) throw insertError4;

    testResults.push({
      scenario: "TRIAL REMINDER - 3 DAYS",
      email: testEmail4,
      stripe_customer_id: customer4.id,
      trial_end_date: "3 days from now",
      properties: 1,
      status: "✅ Ready for 3-day reminder",
    });

    // ========================================
    // SCENARIO 5: Trial Ending Tomorrow (1-Day Reminder Ready)
    // ========================================
    console.log("\n[TEST 5] Creating trial ending in 1 day...");
    
    const testEmail5 = `test-reminder-1day-${Date.now()}@phase2testing.com`;
    
    const customer5 = await stripe.customers.create({
      email: testEmail5,
      name: "1-Day Reminder Test User",
      metadata: {
        test: 'phase2',
        scenario: 'trial_reminder_1day',
      }
    });

    const paymentMethod5 = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa',
      },
    });

    await stripe.paymentMethods.attach(paymentMethod5.id, {
      customer: customer5.id,
    });

    const testUserId5 = crypto.randomUUID();

    const { error: insertError5 } = await supabase
      .from("subscribers")
      .insert({
        user_id: testUserId5,
        email: testEmail5,
        stripe_customer_id: customer5.id,
        payment_method_id: paymentMethod5.id,
        is_trial_active: true,
        trial_start_date: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        active_properties_count: 4,
        subscribed: false,
        is_cancelled: false,
        subscription_status: 'trialing',
      });

    if (insertError5) throw insertError5;

    testResults.push({
      scenario: "TRIAL REMINDER - 1 DAY",
      email: testEmail5,
      stripe_customer_id: customer5.id,
      payment_method_id: paymentMethod5.id,
      trial_end_date: "Tomorrow",
      properties: 4,
      status: "✅ Ready for final reminder + auto-convert next day",
    });

    console.log("\n[SETUP-TEST-DATA] All test scenarios created successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phase 2 test data created with real Stripe integration",
        test_scenarios: testResults,
        next_steps: [
          "1. Click 'Auto-Convert Trials' to convert expired trial",
          "2. Click 'Adjust Billing' to adjust subscription with property mismatch",
          "3. Click 'Trial Reminders' to send reminder emails",
          "4. Check Stripe Dashboard to verify all operations",
        ],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("[SETUP-TEST-DATA] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
