import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancellationConfirmationRequest {
  recipient_email: string;
  recipient_name: string;
  cancellation_date: string;
  was_trial: boolean;
  property_count?: number;
  cancellation_reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipient_email,
      recipient_name,
      cancellation_date,
      was_trial,
      property_count,
      cancellation_reason,
    }: CancellationConfirmationRequest = await req.json();

    const cancelDateFormatted = new Date(cancellation_date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = was_trial 
      ? "Trial Cancelled - We're Sorry to See You Go"
      : "Subscription Cancelled - Confirmation";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6b7280;">Cancellation Confirmed</h1>
        <p>Hi ${recipient_name},</p>
        <p>We've received your ${was_trial ? 'trial' : 'subscription'} cancellation request and have processed it successfully.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Cancellation Details</h3>
          <p><strong>Cancellation Date:</strong> ${cancelDateFormatted}</p>
          <p><strong>Type:</strong> ${was_trial ? 'Free Trial' : 'Paid Subscription'}</p>
          ${property_count ? `<p><strong>Properties Managed:</strong> ${property_count}</p>` : ''}
          ${cancellation_reason ? `<p><strong>Reason:</strong> ${cancellation_reason}</p>` : ''}
        </div>
        
        ${!was_trial ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #2563eb;">Your Access</h4>
            <p style="margin: 0;">Your account will remain active until the end of your current billing period. You won't be charged again.</p>
          </div>
        ` : ''}
        
        <h3>What Happens Next?</h3>
        <ul>
          <li>Your data will be preserved for 30 days</li>
          <li>You can reactivate your account anytime</li>
          <li>No further charges will be made</li>
          ${was_trial ? '<li>Your trial access has ended immediately</li>' : ''}
        </ul>
        
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #059669;">We'd Love to Have You Back!</h4>
          <p>If you change your mind, you can reactivate your account from your billing dashboard at any time.</p>
          <div style="margin: 15px 0; text-align: center;">
            <a href="https://your-app-url.com/billing" 
               style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reactivate Account
            </a>
          </div>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Help Us Improve</h4>
          <p style="margin: 0;">We're sorry to see you go. If you have a moment, we'd love to hear your feedback about why you cancelled.</p>
          <div style="margin: 15px 0;">
            <a href="https://your-app-url.com/feedback" 
               style="color: #2563eb; text-decoration: underline;">
              Share Your Feedback
            </a>
          </div>
        </div>
        
        <p>If this cancellation was a mistake or you need any assistance, please contact our support team immediately.</p>
        
        <p>Thank you for trying our service!</p>
        <p>Best regards,<br>The Property Management Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated confirmation email. Your cancellation has been processed successfully.
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
        from: "Property Management <onboarding@housinghub.app>",
        to: [recipient_email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailResponse = await resendResponse.json();
    console.log("Cancellation confirmation email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-cancellation-confirmation function:", error);
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
