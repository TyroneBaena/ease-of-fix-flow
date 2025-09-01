import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const authHookSecret = Deno.env.get("AUTH_HOOK_SECRET") || "auth-email-hook-secret-2024";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailData {
  user: {
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Auth email webhook triggered");
    
    // Verify the webhook secret
    const providedSecret = req.headers.get("authorization")?.replace("Bearer ", "") || 
                          req.headers.get("x-webhook-secret");
    
    if (providedSecret !== authHookSecret) {
      console.error("Invalid webhook secret provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const webhookData: AuthEmailData = await req.json();
    console.log("Webhook data received:", {
      email: webhookData.user.email,
      action_type: webhookData.email_data.email_action_type
    });

    const { user, email_data } = webhookData;
    const { token_hash, redirect_to, email_action_type } = email_data;

    let subject = "";
    let htmlContent = "";

    if (email_action_type === "signup") {
      subject = "Confirm your HousingHub account";
      const confirmUrl = `${email_data.site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px; font-weight: bold;">H</span>
            </div>
            <h1 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: bold;">Welcome to HousingHub</h1>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 20px; font-size: 20px;">Confirm Your Email Address</h2>
            <p style="color: #4b5563; margin-bottom: 25px; line-height: 1.6;">
              Hi${user.user_metadata?.name ? ` ${user.user_metadata.name}` : ''},
            </p>
            <p style="color: #4b5563; margin-bottom: 25px; line-height: 1.6;">
              Thanks for signing up for HousingHub! To complete your registration and access your property maintenance dashboard, please confirm your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Confirm Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${confirmUrl}" style="color: #3b82f6; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>If you didn't create an account with HousingHub, you can safely ignore this email.</p>
            <p style="margin-bottom: 0;">© 2024 HousingHub. All rights reserved.</p>
          </div>
        </div>
      `;
    } else if (email_action_type === "recovery") {
      subject = "Reset your HousingHub password";
      const resetUrl = `${email_data.site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px; font-weight: bold;">H</span>
            </div>
            <h1 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: bold;">Reset Your Password</h1>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
            <p style="color: #4b5563; margin-bottom: 25px; line-height: 1.6;">
              You requested to reset your password for your HousingHub account. Click the button below to choose a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="margin-bottom: 0;">© 2024 HousingHub. All rights reserved.</p>
          </div>
        </div>
      `;
    } else {
      // Fallback for other email types
      subject = `Action required for your HousingHub account`;
      const actionUrl = `${email_data.site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937;">HousingHub</h1>
          <p>Please click the link below to complete this action:</p>
          <a href="${actionUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Action</a>
        </div>
      `;
    }

    console.log("Sending email via Resend from housinghub.app domain");

    const emailResponse = await resend.emails.send({
      from: "HousingHub <noreply@housinghub.app>",
      to: [user.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);