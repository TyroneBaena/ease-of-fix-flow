import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== AUTH EMAIL WEBHOOK RECEIVED ===");
    
    const body = await req.json();
    console.log("Webhook body:", JSON.stringify(body, null, 2));
    
    // Handle both webhook formats - direct trigger and auth webhook
    let emailData, userEmail, confirmationUrl;
    
    if (body.type === 'INSERT' && body.table === 'users' && body.record) {
      // Direct trigger format
      emailData = body.record;
      userEmail = emailData.email;
      confirmationUrl = emailData.confirmation_url;
    } else if (body.user && body.email_data) {
      // Auth webhook format
      emailData = body.email_data;
      userEmail = body.user.email;
      confirmationUrl = `https://ltjlswzrdgtoddyqmydo.supabase.co/auth/v1/verify?token=${emailData.token_hash}&type=${emailData.email_action_type}&redirect_to=${emailData.redirect_to}`;
    } else {
      console.log("Webhook received but conditions not met:", { 
        hasType: !!body.type, 
        hasTable: !!body.table, 
        hasRecord: !!body.record,
        hasUser: !!body.user,
        hasEmailData: !!body.email_data
      });
      return new Response(JSON.stringify({ 
        success: true,
        message: "No action needed",
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    if (userEmail && confirmationUrl) {
      const resend = new Resend(Deno.env.get("NEW_RESEND_API_KEY"));
      
      console.log("Sending confirmation email to:", userEmail);
      console.log("Using confirmation URL:", confirmationUrl);
      
      const emailResponse = await resend.emails.send({
        from: "Housing Hub <noreply@housinghub.app>",
        to: [userEmail],
        subject: "Confirm your Housing Hub account",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Your Account</title>
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #333; margin: 0; font-size: 28px;">Welcome to Housing Hub!</h1>
              </div>
              
              <div style="margin-bottom: 30px;">
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Thanks for signing up! Please confirm your email address to complete your account setup.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                  Confirm Email Address
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 14px; line-height: 1.5; margin: 0;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
                <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 10px 0 0 0;">
                  If the button doesn't work, copy and paste this link: ${confirmationUrl}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      
      console.log("Email sent successfully:", emailResponse);
      
      if (emailResponse.error) {
        throw new Error(`Resend API error: ${emailResponse.error.message}`);
      }
    } else {
      console.log("Missing required email data:", { userEmail, confirmationUrl });
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      timestamp: new Date().toISOString(),
      processed: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error: any) {
    console.error("Error in send-auth-email:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Return 200 to avoid Supabase retries
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }
});