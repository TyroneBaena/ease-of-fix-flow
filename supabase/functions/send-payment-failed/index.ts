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
  email_type?: 'first_failure' | 'second_failure' | 'final_notice';
  is_suspended?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
    const {
      recipient_email,
      recipient_name,
      amount_due,
      attempt_count,
      next_attempt_date,
      email_type = 'first_failure',
      is_suspended = false,
    }: PaymentFailedRequest = await req.json();

    // PHASE 4: Differentiated email messages based on attempt count
    let subject = "Payment Failed - Action Required";
    let headerText = "⚠️ Payment Failed";
    let urgencyText = "";
    
    if (email_type === 'first_failure') {
      subject = `Payment Failed - We'll Try Again in 3 Days ($${amount_due} AUD)`;
      headerText = "⚠️ Payment Failed";
      urgencyText = "We were unable to process your payment. Don't worry - we'll automatically retry in 3 days.";
    } else if (email_type === 'second_failure') {
      subject = `IMPORTANT: Payment Failed Again - Final Attempt in 3 Days ($${amount_due} AUD)`;
      headerText = "⚠️ Second Payment Failure";
      urgencyText = "This is your second failed payment attempt. Please update your payment method immediately. We'll make one final automatic attempt in 3 days.";
    } else if (email_type === 'final_notice') {
      subject = `🚨 URGENT: Account Suspended - Update Payment Method Now`;
      headerText = "🚨 Account Suspended";
      urgencyText = "Your account has been suspended after 3 failed payment attempts. All features are currently disabled. Update your payment method now to restore immediate access.";
    }
    
    let nextAttemptText = '';
    if (!is_suspended && next_attempt_date) {
      const formattedDate = new Date(next_attempt_date).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      nextAttemptText = `<p>We'll automatically retry the payment on <strong>${formattedDate}</strong>.</p>`;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">${headerText}</h1>
        <p>Hi ${recipient_name},</p>
        
        ${is_suspended ? `
        <div style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h2 style="margin-top: 0; color: #dc2626;">🚨 YOUR ACCOUNT IS SUSPENDED</h2>
          <p style="margin: 0; font-size: 15px;">All features are currently disabled. Update your payment method immediately to restore access.</p>
        </div>
        ` : ''}
        
        <p>${urgencyText}</p>
        
        <div style="background-color: ${is_suspended ? '#fee2e2' : '#fef2f2'}; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #dc2626;">Payment Attempt #${attempt_count}</h3>
          <p><strong>Amount Due:</strong> $${amount_due} AUD</p>
          ${is_suspended 
            ? '<p style="margin: 0; font-weight: 600; color: #dc2626;">Your account is suspended. Update payment method to restore access.</p>' 
            : nextAttemptText}
        </div>
        
        <h3>What You Need To Do</h3>
        <ol>
          <li>Log in to your billing dashboard</li>
          <li>Update your payment method with a valid card</li>
          <li>Ensure sufficient funds are available</li>
          ${is_suspended ? '<li>Click "Reactivate" to restore your account immediately</li>' : ''}
        </ol>
        
        <div style="margin: 30px 0;">
          <a href="${applicationUrl}/billing" 
             style="display: inline-block; background-color: ${is_suspended ? '#dc2626' : '#2563eb'}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            ${is_suspended ? '🚨 Update Payment & Restore Access' : 'Update Payment Method'}
          </a>
        </div>
        
        ${!is_suspended ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Warning:</strong> After 3 failed attempts, your account will be suspended and all features will be disabled.</p>
        </div>
        ` : ''}
        
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
        from: "Property Management <onboarding@housinghub.app>",
        to: [recipient_email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailResponse = await resendResponse.json();
    console.log("Payment failed email sent successfully:", emailResponse, "Type:", email_type);

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