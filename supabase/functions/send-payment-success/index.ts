import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentSuccessRequest {
  recipient_email: string;
  recipient_name: string;
  amount_paid: number;
  property_count: number;
  billing_period_start: string;
  billing_period_end: string;
  next_billing_date: string;
  invoice_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipient_email,
      recipient_name,
      amount_paid,
      property_count,
      billing_period_start,
      billing_period_end,
      next_billing_date,
      invoice_url,
    }: PaymentSuccessRequest = await req.json();

    const periodStart = new Date(billing_period_start).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    const periodEnd = new Date(billing_period_end).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const nextBilling = new Date(next_billing_date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `✅ Payment Received - $${amount_paid} AUD`;
    
    let invoiceButton = '';
    if (invoice_url) {
      invoiceButton = `
        <div style="margin: 20px 0;">
          <a href="${invoice_url}" 
             style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Download Invoice
          </a>
        </div>
      `;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">✅ Payment Successful!</h1>
        <p>Hi ${recipient_name},</p>
        <p>Thank you! We've successfully processed your subscription payment.</p>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #059669;">Payment Confirmed</h3>
          <p style="margin: 0;">Your subscription is active and all services continue uninterrupted.</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Summary</h3>
          <p><strong>Amount Paid:</strong> $${amount_paid} AUD</p>
          <p><strong>Active Properties:</strong> ${property_count}</p>
          <p><strong>Billing Period:</strong> ${periodStart} - ${periodEnd}</p>
          <p><strong>Next Billing Date:</strong> ${nextBilling}</p>
        </div>
        
        ${invoiceButton}
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">📊 Your Active Subscription</h4>
          <p>You're managing <strong>${property_count} ${property_count === 1 ? 'property' : 'properties'}</strong> at $29 AUD each per month.</p>
          <p style="margin-bottom: 0;">Your next payment of $${amount_paid} AUD will be automatically charged on ${nextBilling}.</p>
        </div>
        
        <h3>Need Help?</h3>
        <p>If you have any questions about your billing or need to make changes to your subscription, visit your billing dashboard or contact our support team.</p>
        
        <p>Thank you for your business!</p>
        <p>Best regards,<br>The Property Management Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is a payment receipt from Property Management. Keep this email for your records.
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
    console.log("Payment success email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-payment-success function:", error);
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
