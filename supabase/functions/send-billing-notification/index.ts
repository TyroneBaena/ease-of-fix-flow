import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BillingNotificationRequest {
  recipient_email: string;
  recipient_name: string;
  property_count: number;
  monthly_amount: number;
  change_type: 'added' | 'removed';
  properties_changed: number;
  is_trial: boolean;
  is_subscribed: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Billing notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipient_email,
      recipient_name,
      property_count,
      monthly_amount,
      change_type,
      properties_changed,
      is_trial,
      is_subscribed
    }: BillingNotificationRequest = await req.json();

    console.log("Sending billing notification to:", recipient_email);

    // Generate email content based on the change type and subscription status
    let subject: string;
    let htmlContent: string;

    if (change_type === 'added') {
      if (is_trial) {
        subject = `Property Added - Your billing after trial will be $${monthly_amount} AUD/month`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🏢 Property Added to Your Account</h1>
            <p>Hi ${recipient_name},</p>
            <p>You've successfully added ${properties_changed === 1 ? 'a new property' : `${properties_changed} new properties`} to your account.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Billing Summary</h3>
              <p><strong>Total Properties:</strong> ${property_count}</p>
              <p><strong>Billing after trial:</strong> $${monthly_amount} AUD/month</p>
              <p style="color: #059669;"><strong>You're currently on a free trial</strong> - no charges will apply until your trial ends.</p>
            </div>
            
            <p>Each property is billed at $29 AUD per month once your trial period expires.</p>
            <p>You can manage your properties and billing settings in your dashboard.</p>
            
            <p>Best regards,<br>The Property Management Team</p>
          </div>
        `;
      } else if (is_subscribed) {
        subject = `Property Added - $${properties_changed * 29} AUD will be added to your next bill`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🏢 Property Added to Your Account</h1>
            <p>Hi ${recipient_name},</p>
            <p>You've successfully added ${properties_changed === 1 ? 'a new property' : `${properties_changed} new properties`} to your account.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Billing Update</h3>
              <p><strong>Total Properties:</strong> ${property_count}</p>
              <p><strong>Additional Monthly Cost:</strong> $${properties_changed * 29} AUD</p>
              <p><strong>New Monthly Total:</strong> $${monthly_amount} AUD</p>
            </div>
            
            <p>The additional cost for ${properties_changed === 1 ? 'this property' : 'these properties'} will be included in your next billing cycle.</p>
            <p>You can manage your properties and billing settings in your dashboard.</p>
            
            <p>Best regards,<br>The Property Management Team</p>
          </div>
        `;
      }
    } else {
      // Property removed
      if (is_trial) {
        subject = `Property Removed - Your billing after trial will be $${monthly_amount} AUD/month`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🏢 Property Removed from Your Account</h1>
            <p>Hi ${recipient_name},</p>
            <p>You've successfully removed ${properties_changed === 1 ? 'a property' : `${properties_changed} properties`} from your account.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Updated Billing Summary</h3>
              <p><strong>Total Properties:</strong> ${property_count}</p>
              <p><strong>Billing after trial:</strong> $${monthly_amount} AUD/month</p>
              <p style="color: #059669;"><strong>You're currently on a free trial</strong> - no charges will apply until your trial ends.</p>
            </div>
            
            <p>Your billing after the trial period will reflect the updated property count.</p>
            <p>You can manage your properties and billing settings in your dashboard.</p>
            
            <p>Best regards,<br>The Property Management Team</p>
          </div>
        `;
      } else if (is_subscribed) {
        subject = `Property Removed - Your billing will decrease by $${properties_changed * 29} AUD`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🏢 Property Removed from Your Account</h1>
            <p>Hi ${recipient_name},</p>
            <p>You've successfully removed ${properties_changed === 1 ? 'a property' : `${properties_changed} properties`} from your account.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Billing Update</h3>
              <p><strong>Total Properties:</strong> ${property_count}</p>
              <p><strong>Monthly Savings:</strong> $${properties_changed * 29} AUD</p>
              <p><strong>New Monthly Total:</strong> $${monthly_amount} AUD</p>
            </div>
            
            <p>Your billing will decrease starting from your next billing cycle.</p>
            <p>You can manage your properties and billing settings in your dashboard.</p>
            
            <p>Best regards,<br>The Property Management Team</p>
          </div>
        `;
      }
    }

    // Use Resend API directly with fetch
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("NEW_RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Property Management <onboarding@housinghub.app>",
        to: [recipient_email],
        subject: subject!,
        html: htmlContent!,
      }),
    });

    const emailResponse = await resendResponse.json();
    console.log("Billing notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-billing-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);