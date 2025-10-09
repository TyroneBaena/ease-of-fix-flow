import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReactivationEmailRequest {
  recipient_email: string;
  recipient_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_email, recipient_name }: ReactivationEmailRequest = await req.json();

    console.log("Sending reactivation confirmation to:", recipient_email);

    const emailResponse = await resend.emails.send({
      from: "Property Manager <noreply@yourdomain.com>",
      to: [recipient_email],
      subject: "Welcome Back! Your Account Has Been Reactivated",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Reactivated</title>
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome Back!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${recipient_name},
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! Your account has been successfully reactivated. Your payment method has been updated and you now have full access to all features.
              </p>

              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #059669;">
                  <strong>✓ Access Restored</strong><br>
                  All features are now available to you.
                </p>
              </div>

              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #1f2937; font-size: 16px;">What happens next?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                  <li style="margin-bottom: 10px;">Your subscription will continue as normal</li>
                  <li style="margin-bottom: 10px;">Future payments will be charged to your updated payment method</li>
                  <li style="margin-bottom: 10px;">You can manage your billing anytime from your account</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://ltjlswzrdgtoddyqmydo.supabase.co/dashboard" 
                   style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Go to Dashboard
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                <strong>Need Help?</strong><br>
                If you have any questions or concerns, our support team is here to help.
              </p>

              <p style="font-size: 14px; color: #6b7280;">
                Thank you for being a valued customer!
              </p>

            </div>

            <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 5px 0;">Property Manager Platform</p>
              <p style="margin: 5px 0;">© 2025 All rights reserved</p>
            </div>

          </body>
        </html>
      `,
    });

    console.log("Reactivation confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-reactivation-confirmation function:", error);
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