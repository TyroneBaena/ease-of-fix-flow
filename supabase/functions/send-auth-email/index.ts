import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

interface AuthEmailData {
  user: {
    id: string;
    email: string;
    user_metadata?: { name?: string };
  };
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

// Background email function - runs independently
async function sendEmailAsync(webhookData: AuthEmailData) {
  try {
    console.log("🚀 [BACKGROUND] Starting email send for:", webhookData.user.email);
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ [BACKGROUND] RESEND_API_KEY missing");
      return;
    }

    const resend = new Resend(resendApiKey);
    const { user, email_data } = webhookData;
    
    if (email_data.email_action_type !== "signup") {
      console.log("ℹ️ [BACKGROUND] Not a signup email, skipping");
      return;
    }

    const confirmUrl = `${email_data.site_url}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${email_data.redirect_to}`;
    
    console.log("📧 [BACKGROUND] Sending email via Resend...");
    
    const result = await resend.emails.send({
      from: "HousingHub <noreply@housinghub.app>",
      to: [user.email],
      subject: "Confirm your HousingHub account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 50px; height: 50px; background: #3b82f6; border-radius: 8px; line-height: 50px; margin-bottom: 15px;">
              <span style="color: white; font-size: 20px; font-weight: bold;">H</span>
            </div>
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Welcome to HousingHub!</h1>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 18px;">Confirm Your Email</h2>
            <p style="color: #4b5563; line-height: 1.5;">
              Hi${user.user_metadata?.name ? ` ${user.user_metadata.name}` : ''},
            </p>
            <p style="color: #4b5563; line-height: 1.5;">
              Please confirm your email address to complete your HousingHub registration:
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${confirmUrl}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Confirm Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px;">
              If the button doesn't work, copy this link: <br>
              <a href="${confirmUrl}" style="color: #3b82f6; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>© 2024 HousingHub. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error("❌ [BACKGROUND] Email failed:", result.error);
    } else {
      console.log("✅ [BACKGROUND] Email sent successfully!");
      console.log("📬 [BACKGROUND] Email ID:", result.data?.id);
    }

  } catch (error) {
    console.error("❌ [BACKGROUND] Email error:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== AUTH EMAIL WEBHOOK ===");
  
  // CORS
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight");
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
    });
  }

  try {
    // Get body and parse data
    const body = await req.text();
    console.log("📦 Body received, length:", body.length);
    
    const webhookData: AuthEmailData = JSON.parse(body);
    console.log("👤 User:", webhookData.user.email);
    console.log("🔄 Action:", webhookData.email_data.email_action_type);
    
    // Start email sending WITHOUT waiting for it
    console.log("🚀 Starting background email task...");
    sendEmailAsync(webhookData).catch(err => {
      console.error("Background email task failed:", err);
    });
    
    // Return SUCCESS immediately (within milliseconds)
    console.log("⚡ Returning immediate success");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email processing started",
        user_email: webhookData.user.email,
        action: webhookData.email_data.email_action_type,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200, // Still return 200 to prevent retries
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

serve(handler);