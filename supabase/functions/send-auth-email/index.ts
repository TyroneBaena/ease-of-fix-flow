import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

interface AuthEmailData {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🚀 Auth Email Webhook Started");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY not found");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 200, // Return 200 to prevent Supabase retries
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("✅ Resend API key found, initializing...");
    const resend = new Resend(resendApiKey);

    // Parse webhook data
    const body = await req.text();
    console.log("📦 Body received, length:", body.length);
    
    const webhookData: AuthEmailData = JSON.parse(body);
    console.log("📧 Processing email for:", webhookData.user.email);
    console.log("🔄 Action type:", webhookData.email_data.email_action_type);

    const { user, email_data } = webhookData;
    const { token_hash, redirect_to, email_action_type, site_url } = email_data;

    if (email_action_type === "signup") {
      const confirmUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      console.log("📬 Sending signup confirmation email...");
      console.log("🔗 Confirmation URL:", confirmUrl);

      const emailResponse = await resend.emails.send({
        from: "HousingHub <noreply@housinghub.app>",
        to: [user.email],
        subject: "Confirm your HousingHub account",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-block; width: 60px; height: 60px; background: #3b82f6; border-radius: 8px; line-height: 60px; margin-bottom: 20px;">
                <span style="color: white; font-size: 24px; font-weight: bold;">H</span>
              </div>
              <h1 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: bold;">Welcome to HousingHub!</h1>
            </div>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Confirm Your Email Address</h2>
              <p style="color: #4b5563; margin-bottom: 25px; line-height: 1.6;">
                Hi${user.user_metadata?.name ? ` ${user.user_metadata.name}` : ''},
              </p>
              <p style="color: #4b5563; margin-bottom: 25px; line-height: 1.6;">
                Thanks for signing up for HousingHub! To complete your registration and access your property maintenance dashboard, please confirm your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" 
                   style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Confirm Email Address
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${confirmUrl}" style="color: #3b82f6; word-break: break-all;">${confirmUrl}</a>
              </p>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>If you didn't create an account with HousingHub, you can safely ignore this email.</p>
              <p style="margin-bottom: 0;">© 2024 HousingHub. All rights reserved.</p>
            </div>
          </div>
        `,
      });

      console.log("✅ Email sent successfully:", emailResponse);
      console.log("📬 Email ID:", emailResponse.data?.id);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Confirmation email sent successfully",
        emailId: emailResponse.data?.id 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else {
      console.log("ℹ️ Non-signup email type, returning success without sending");
      return new Response(JSON.stringify({ success: true, message: "Non-signup email handled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("❌ Error in auth email function:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Return 200 to prevent Supabase retries
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);