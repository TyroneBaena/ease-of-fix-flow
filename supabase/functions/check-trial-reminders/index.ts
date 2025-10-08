import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[CHECK-TRIAL-REMINDERS] Starting trial reminder check");

    // Get all active trials
    const { data: subscribers, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, email, trial_end_date, active_properties_count")
      .eq("is_trial_active", true)
      .eq("subscribed", false)
      .not("trial_end_date", "is", null);

    if (fetchError) {
      console.error("[CHECK-TRIAL-REMINDERS] Error fetching subscribers:", fetchError);
      throw fetchError;
    }

    console.log(`[CHECK-TRIAL-REMINDERS] Found ${subscribers?.length || 0} active trials`);

    const now = new Date();
    const reminders = [];

    for (const subscriber of subscribers || []) {
      const trialEnd = new Date(subscriber.trial_end_date);
      const daysUntilEnd = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminders at 7, 3, and 1 day before trial ends
      if (daysUntilEnd === 7 || daysUntilEnd === 3 || daysUntilEnd === 1) {
        console.log(`[CHECK-TRIAL-REMINDERS] Sending ${daysUntilEnd}-day reminder to:`, subscriber.email);

        const monthlyAmount = (subscriber.active_properties_count || 0) * 29;

        // Production code - Email sending enabled with NEW_RESEND_API_KEY
        try {
          // Get user metadata for personalization
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(subscriber.user_id);
          
          if (userError) {
            console.error(`[CHECK-TRIAL-REMINDERS] Failed to get user data for ${subscriber.email}:`, userError);
          }
          
          const userName = userData?.user?.user_metadata?.name || subscriber.email.split('@')[0];

          console.log(`[CHECK-TRIAL-REMINDERS] Sending email to ${subscriber.email} via send-trial-reminder function`);
          
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-trial-reminder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              recipient_email: subscriber.email,
              recipient_name: userName,
              days_remaining: daysUntilEnd,
              trial_end_date: subscriber.trial_end_date,
              property_count: subscriber.active_properties_count || 0,
              monthly_amount: monthlyAmount,
            }),
          });

          if (emailResponse.ok) {
            console.log(`[CHECK-TRIAL-REMINDERS] Successfully sent reminder to ${subscriber.email}`);
            reminders.push({
              email: subscriber.email,
              days_remaining: daysUntilEnd,
              property_count: subscriber.active_properties_count || 0,
              monthly_amount: monthlyAmount,
              status: 'sent',
            });
          } else {
            const errorText = await emailResponse.text();
            console.error(`[CHECK-TRIAL-REMINDERS] Email API returned error for ${subscriber.email}:`, errorText);
            reminders.push({
              email: subscriber.email,
              days_remaining: daysUntilEnd,
              status: 'failed',
              error: `Email API error: ${errorText}`,
            });
          }
        } catch (emailError) {
          console.error(`[CHECK-TRIAL-REMINDERS] Failed to send reminder to ${subscriber.email}:`, emailError);
          reminders.push({
            email: subscriber.email,
            days_remaining: daysUntilEnd,
            property_count: subscriber.active_properties_count || 0,
            monthly_amount: monthlyAmount,
            status: 'failed',
            error: emailError.message,
          });
        }
      } else {
        console.log(`[CHECK-TRIAL-REMINDERS] ${subscriber.email}: ${daysUntilEnd} days remaining (no reminder needed)`);
      }
    }

    console.log(`[CHECK-TRIAL-REMINDERS] Processed ${reminders.length} reminder checks`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: reminders.length,
        details: reminders,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[CHECK-TRIAL-REMINDERS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
