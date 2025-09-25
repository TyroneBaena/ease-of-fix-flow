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
    console.log("=== SIMPLIFIED AUTH EMAIL FUNCTION ===");
    
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
      const redirectTo = body.email_data?.redirect_to || "https://lovable.dev/email-confirm";
      confirmationUrl = `https://ltjlswzrdgtoddyqmydo.supabase.co/auth/v1/verify?token=${token}&type=${emailType}&redirect_to=${redirectTo}`;
    } else if (body.record?.email) {
      userEmail = body.record.email;
      confirmationUrl = body.record.confirmation_url || `https://lovable.dev/email-confirm`;
    }
    
    if (!userEmail) {
      console.log("No email found in request");
      return new Response(JSON.stringify({ success: true, message: "No email to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log(`Sending email to: ${userEmail}`);
    
    // Send email with timeout
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
    
    // Race against timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Email timeout")), 4000)
    );
    
    const emailResponse = await Promise.race([emailPromise, timeoutPromise]);
    
    console.log("Email sent successfully");
    
    return new Response(JSON.stringify({ 
      success: true,
      timestamp: new Date().toISOString(),
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("Email function error:", error.message);
    
    // Always return success to avoid webhook retries
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});