import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY") ?? "";
    const inboundReplyBase = Deno.env.get("INBOUND_REPLY_ADDRESS") ?? "";

    console.log("Test function - Environment check:", {
      hasResendKey: !!resendApiKey,
      hasInboundReply: !!inboundReplyBase,
      resendKeyLength: resendApiKey.length,
      inboundReplyAddress: inboundReplyBase
    });

    if (!resendApiKey || !inboundReplyBase) {
      return new Response(JSON.stringify({ 
        error: "Missing RESEND_API_KEY or INBOUND_REPLY_ADDRESS",
        hasResendKey: !!resendApiKey,
        hasInboundReply: !!inboundReplyBase
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const { test_email } = await req.json();
    if (!test_email) {
      return new Response(JSON.stringify({ error: "test_email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const resend = new Resend(resendApiKey);
    
    const sendResult = await resend.emails.send({
      from: "Property Manager <onboarding@housinghub.app>",
      to: [test_email],
      subject: "Test Email - Landlord Assignment Notification",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6;">
          <h2>🎉 Test Email Successful!</h2>
          <p>This is a test email to verify that the landlord assignment notification system is working properly.</p>
          <p><strong>Configuration Status:</strong></p>
          <ul>
            <li>✅ RESEND_API_KEY: Available</li>
            <li>✅ INBOUND_REPLY_ADDRESS: Available</li>
            <li>✅ Function Configuration: Properly set up</li>
          </ul>
          <p>Your email notification system is ready to use!</p>
        </div>
      `,
    });

    console.log("Test email sent successfully:", { id: sendResult?.data?.id });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Test email sent successfully",
      emailId: sendResult?.data?.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Test function error:", message);
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});