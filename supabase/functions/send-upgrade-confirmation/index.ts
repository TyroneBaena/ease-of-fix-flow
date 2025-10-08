import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpgradeConfirmationRequest {
  recipient_email: string;
  recipient_name: string;
  property_count: number;
  monthly_amount: number;
  next_billing_date: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipient_email,
      recipient_name,
      property_count,
      monthly_amount,
      next_billing_date,
    }: UpgradeConfirmationRequest = await req.json();

    const formattedDate = new Date(next_billing_date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `🎉 Welcome to Your Paid Subscription - $${monthly_amount} AUD/month`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">🎉 Your Subscription is Now Active!</h1>
        <p>Hi ${recipient_name},</p>
        <p>Thank you for upgrading to a paid subscription! Your property management platform is now fully active.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Subscription Details</h3>
          <p><strong>Active Properties:</strong> ${property_count}</p>
          <p><strong>Monthly Cost:</strong> $${monthly_amount} AUD</p>
          <p><strong>Next Billing Date:</strong> ${formattedDate}</p>
          <p><strong>Price per Property:</strong> $29 AUD/month</p>
        </div>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #059669;">What's Included</h4>
          <ul style="margin: 10px 0;">
            <li>Unlimited maintenance requests</li>
            <li>Contractor management</li>
            <li>Budget tracking and reporting</li>
            <li>Document storage</li>
            <li>Priority support</li>
          </ul>
        </div>
        
        <h3>Billing Information</h3>
        <p>Your subscription will automatically renew on <strong>${formattedDate}</strong>. You'll receive an invoice before each billing cycle.</p>
        <p>You can manage your subscription, update payment methods, or cancel anytime from your billing dashboard.</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-radius: 8px;">
          <h4 style="margin-top: 0;">💡 Pro Tip</h4>
          <p>Add or remove properties anytime - your billing will automatically adjust with pro-rated charges on your next invoice.</p>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
        
        <p>Best regards,<br>The Property Management Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated message from Property Management. 
          To manage your subscription, visit your billing dashboard.
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
    console.log("Upgrade confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-upgrade-confirmation function:", error);
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
