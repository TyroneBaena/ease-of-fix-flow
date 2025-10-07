import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const {
      recipient_email,
      recipient_name,
      days_remaining,
      trial_end_date,
      property_count,
      monthly_amount,
    }: TrialReminderRequest = await req.json();

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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${urgencyColor};">${urgencyText}</h1>
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
          <a href="https://your-app-url.com/billing" 
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
        
        <p>Best regards,<br>The Property Management Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated reminder about your trial expiration. To manage your subscription, visit your billing dashboard.
        </p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("NEW_RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Property Management <onboarding@resend.dev>",
        to: [recipient_email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailResponse = await resendResponse.json();
    console.log(`Trial reminder email sent (${days_remaining} days):`, emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-trial-reminder function:", error);
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
