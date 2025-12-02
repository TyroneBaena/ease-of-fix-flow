import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialReminderRequest {
  recipient_email: string;
  recipient_name: string;
  days_remaining: number;
  trial_end_date: string;
  property_count: number;
  monthly_amount: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL: Use NEW_RESEND_API_KEY for production email sending
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("[SEND-TRIAL-REMINDER] CRITICAL: NEW_RESEND_API_KEY not configured");
      throw new Error("Email service not configured - missing NEW_RESEND_API_KEY");
    }
    
    const resend = new Resend(resendApiKey);
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';

    const {
      recipient_email,
      recipient_name,
      days_remaining,
      trial_end_date,
      property_count,
      monthly_amount,
    }: TrialReminderRequest = await req.json();

    console.log(`[SEND-TRIAL-REMINDER] Sending ${days_remaining}-day reminder to ${recipient_email}`);

    const trialEndFormatted = new Date(trial_end_date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let urgencyColor = '#2563eb';
    let urgencyText = 'Trial Ending Soon';
    
    if (days_remaining === 1) {
      urgencyColor = '#dc2626';
      urgencyText = 'Last Day of Trial';
    } else if (days_remaining <= 3) {
      urgencyColor = '#ea580c';
    }

    const subject = days_remaining === 1 
      ? `⏰ Last Day of Your Free Trial - Action Required`
      : `⏰ Your Trial Ends in ${days_remaining} Days`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trial Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⏰ ${urgencyText}</h1>
          </div>
          
          <p>Hi ${recipient_name},</p>
          <p>Your free trial ${days_remaining === 1 ? 'ends tomorrow' : `ends in ${days_remaining} days`} on <strong>${trialEndFormatted}</strong>.</p>
          
          <div style="background-color: #fef3c7; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: ${urgencyColor};">Don't Lose Access!</h3>
            <p style="margin: 0;">Upgrade now to continue managing your ${property_count} ${property_count === 1 ? 'property' : 'properties'} without interruption.</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Subscription Details</h3>
            <p><strong>Active Properties:</strong> ${property_count}</p>
            <p><strong>Monthly Cost:</strong> $${monthly_amount} AUD</p>
            <p><strong>Price per Property:</strong> $29 AUD/month</p>
            <p><strong>Trial Ends:</strong> ${trialEndFormatted}</p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${applicationUrl}/billing" 
               style="display: inline-block; background-color: ${urgencyColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Upgrade to Paid Plan
            </a>
          </div>
          
          <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #059669;">What You'll Get</h4>
            <ul style="margin: 10px 0;">
              <li>Unlimited maintenance requests</li>
              <li>Contractor management</li>
              <li>Budget tracking and reporting</li>
              <li>Document storage</li>
              <li>Priority support</li>
            </ul>
          </div>
          
          ${days_remaining === 1 ? `
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #dc2626; font-weight: bold;">⚠️ This is your final reminder - upgrade today to avoid service interruption!</p>
            </div>
          ` : ''}
          
          <p>If you have any questions or need help upgrading, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The HousingHub Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>HousingHub - Property Management Made Simple</p>
            <p>This is an automated reminder about your trial expiration.</p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: "HousingHub <notifications@housinghub.app>",
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error(`[SEND-TRIAL-REMINDER] Resend error for ${recipient_email}:`, error);
      throw error;
    }

    console.log(`[SEND-TRIAL-REMINDER] Successfully sent ${days_remaining}-day reminder to ${recipient_email}, Email ID: ${data?.id}`);

    return new Response(JSON.stringify({
      success: true,
      email_id: data?.id,
      recipient: recipient_email,
      days_remaining,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[SEND-TRIAL-REMINDER] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
