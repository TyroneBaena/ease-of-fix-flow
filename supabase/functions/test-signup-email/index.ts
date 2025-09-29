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
    console.log("=== TESTING SIGNUP EMAIL FUNCTIONALITY ===");
    
    const body = await req.json();
    const testEmail = body.email || "test@example.com";
    
    // Check if Resend API key exists
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("NEW_RESEND_API_KEY not found");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "NEW_RESEND_API_KEY not configured" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log("NEW_RESEND_API_KEY found, initializing Resend...");
    
    const resend = new Resend(resendApiKey);
    
    // Test email send
    const confirmationUrl = `https://lovable.dev/email-confirm?token=test123&type=signup`;
    
    console.log(`Sending test email to: ${testEmail}`);
    
    const emailResponse = await resend.emails.send({
      from: "Housing Hub <noreply@housinghub.app>",
      to: [testEmail],
      subject: "Test - Housing Hub Email Confirmation",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Test Email - Housing Hub</h1>
          <p>This is a test email to verify that the signup email functionality is working.</p>
          <a href="${confirmationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Test Confirmation Link
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Test sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });
    
    console.log("Test email sent successfully:", emailResponse);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: "Test email sent successfully",
      emailId: emailResponse.data?.id,
      testEmail: testEmail,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("Test email function error:", error.message);
    
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