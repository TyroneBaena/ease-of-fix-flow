import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  console.log("=== Auth Email Hook Started ===");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Get the Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found in environment");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Resend API key found, initializing...");
    const resend = new Resend(resendApiKey);

    // Parse the webhook data
    let webhookData: AuthEmailData;
    try {
      const body = await req.text();
      console.log("Raw webhook body received:", body.substring(0, 200) + "...");
      webhookData = JSON.parse(body);
      console.log("Webhook data parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse webhook data:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { user, email_data } = webhookData;
    
    if (!user?.email) {
      console.error("No user email in webhook data");
      return new Response(JSON.stringify({ error: "No user email provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Processing email for:", user.email, "Action:", email_data.email_action_type);

    const { token_hash, redirect_to, email_action_type, site_url } = email_data;

    let subject = "";
    let htmlContent = "";

    if (email_action_type === "signup") {
      subject = "Confirm your HousingHub account";
      const confirmUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: #3b82f6; border-radius: 8px; line-height: 60px; margin-bottom: 20px;">
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
              If the button doesn't work, copy and paste this link:<br>
              <a href="${confirmUrl}" style="color: #3b82f6; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 14px;">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p style="margin-bottom: 0;">© 2024 HousingHub. All rights reserved.</p>
          </div>
        </div>
      `;
    } else if (email_action_type === "recovery") {
      subject = "Reset your HousingHub password";
      const resetUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: bold;">Reset Your Password</h1>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
            <p style="color: #4b5563; margin-bottom: 25px; line-height: 1.6;">
              You requested to reset your password for your HousingHub account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
          </div>
        </div>
      `;
    } else {
      // Fallback for other email types
      subject = `Action required for your HousingHub account`;
      const actionUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
      
      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937;">HousingHub</h1>
          <p>Please click the link below to complete this action:</p>
          <a href="${actionUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Action</a>
        </div>
      `;
    }

    console.log("Sending email via Resend...");

    try {
      const emailResponse = await resend.emails.send({
        from: "HousingHub <noreply@housinghub.app>",
        to: [user.email],
        subject: subject,
        html: htmlContent,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        emailId: emailResponse.data?.id 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (emailError) {
      console.error("Resend email error:", emailError);
      return new Response(JSON.stringify({ 
        error: "Failed to send email",
        details: emailError.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("=== Function Error ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);