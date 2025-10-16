import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    console.log("=== AUTH EMAIL FUNCTION (BACKGROUND TASK) ===");
    
    const body = await req.json();
    console.log("Request received");
    
    // Initialize Resend early
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("NEW_RESEND_API_KEY not found");
      throw new Error("Email service not configured");
    }
    
    const resend = new Resend(resendApiKey);
    console.log("Resend initialized");
    
    // Extract email and create confirmation URL with proper token
    let userEmail = "";
    let confirmationUrl = "";
    
    if (body.user?.email) {
      userEmail = body.user.email;
      const token = body.email_data?.token_hash || body.email_data?.token || "";
      const emailType = body.email_data?.email_action_type || "signup";
      const redirectTo = body.email_data?.redirect_to || "https://preview--housinghub.lovable.app/email-confirm";
      confirmationUrl = `https://ltjlswzrdgtoddyqmydo.supabase.co/auth/v1/verify?token=${token}&type=${emailType}&redirect_to=${encodeURIComponent(redirectTo)}`;
    } else if (body.record?.email) {
      userEmail = body.record.email;
      confirmationUrl = body.record.confirmation_url || `https://preview--housinghub.lovable.app/email-confirm`;
    }
    
    if (!userEmail) {
      console.log("No email found in request");
      return new Response(JSON.stringify({ success: true, message: "No email to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log(`Queuing email to: ${userEmail}`);
    
    // Define background email sending task with extended timeout and retry
    const sendEmailTask = async () => {
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          console.log(`Attempting to send email to ${userEmail} (${4 - retries}/3)...`);
          
          const emailPromise = resend.emails.send({
            from: "Housing Hub <noreply@housinghub.app>",
            to: [userEmail],
            subject: "Confirm your Housing Hub account",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #333;">Welcome to Housing Hub!</h1>
                <p>Please confirm your email address by clicking the button below:</p>
                <a href="${confirmationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Confirm Email
                </a>
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                  If the button doesn't work, copy this link: ${confirmationUrl}
                </p>
              </div>
            `,
          });
          
          // Extended timeout: 15 seconds
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Email timeout after 15s")), 15000)
          );
          
          const emailResponse = await Promise.race([emailPromise, timeoutPromise]);
          
          console.log(`✅ Email sent successfully to ${userEmail}. Email ID: ${(emailResponse as any)?.data?.id}`);
          return;
          
        } catch (error: any) {
          lastError = error;
          retries--;
          console.error(`❌ Email send attempt failed: ${error.message}. Retries left: ${retries}`);
          
          if (retries > 0) {
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // All retries exhausted
      console.error(`🚨 CRITICAL: Failed to send email to ${userEmail} after 3 attempts. Last error: ${lastError?.message}`);
    };
    
    // Use EdgeRuntime.waitUntil to run email sending in background
    // This allows the webhook to return immediately while email continues processing
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(sendEmailTask());
      console.log("Background email task queued successfully");
    } else {
      // Fallback: send synchronously if EdgeRuntime not available
      console.log("EdgeRuntime not available, sending email synchronously");
      await sendEmailTask();
    }
    
    // Return immediate success response to Supabase webhook
    return new Response(JSON.stringify({ 
      success: true,
      message: "Email queued for delivery",
      timestamp: new Date().toISOString(),
      recipient: userEmail
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("Email function setup error:", error.message);
    
    // Return error status so Supabase knows there was a problem
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

// Handle shutdown gracefully
addEventListener('beforeunload', (ev) => {
  console.log('Email function shutdown:', ev.detail?.reason);
});