import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentFailedRequest {
  recipient_email: string;
  recipient_name: string;
  amount_due: number;
  attempt_count: number;
  next_attempt_date?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipient_email,
      recipient_name,
      amount_due,
      attempt_count,
      next_attempt_date,
    }: PaymentFailedRequest = await req.json();

    const subject = `⚠️ Payment Failed - Action Required ($${amount_due} AUD)`;
    
    let nextAttemptText = '';
    if (next_attempt_date) {
      const formattedDate = new Date(next_attempt_date).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      nextAttemptText = `<p>We'll automatically retry the payment on <strong>${formattedDate}</strong>.</p>`;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">⚠️ Payment Failed</h1>
        <p>Hi ${recipient_name},</p>
        <p>We were unable to process your subscription payment of <strong>$${amount_due} AUD</strong>.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #dc2626;">Action Required</h3>
          <p>This is payment attempt <strong>#${attempt_count}</strong>. Please update your payment method to avoid service interruption.</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details</h3>
          <p><strong>Amount Due:</strong> $${amount_due} AUD</p>
          <p><strong>Failed Attempts:</strong> ${attempt_count}</p>
          ${nextAttemptText}
        </div>
        
        <h3>What You Can Do</h3>
        <ol>
          <li>Log in to your billing dashboard</li>
          <li>Update your payment method</li>
          <li>Ensure sufficient funds are available</li>
        </ol>
        
        <div style="margin: 30px 0;">
          <a href="https://your-app-url.com/billing" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Update Payment Method
          </a>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Note:</strong> If payment continues to fail, your subscription may be suspended after 3 attempts.</p>
        </div>
        
        <p>If you believe this is an error or need assistance, please contact our support team immediately.</p>
        
        <p>Best regards,<br>The Property Management Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated payment notification from Property Management.
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
    console.log("Payment failed email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-payment-failed function:", error);
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
