import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🔧 Debug function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get all environment variables we need
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const inboundReplyBase = Deno.env.get("INBOUND_REPLY_ADDRESS");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const debugInfo = {
      timestamp: new Date().toISOString(),
      resend_api_key: {
        exists: !!resendApiKey,
        length: resendApiKey ? resendApiKey.length : 0,
        first_chars: resendApiKey ? resendApiKey.substring(0, 4) + "..." : "N/A"
      },
      inbound_reply_address: {
        exists: !!inboundReplyBase,
        value: inboundReplyBase || "N/A"
      },
      supabase_url: {
        exists: !!supabaseUrl,
        value: supabaseUrl || "N/A"
      },
      service_key: {
        exists: !!serviceKey,
        length: serviceKey ? serviceKey.length : 0
      },
      all_env_vars: Object.keys(Deno.env.toObject()).filter(key => 
        key.includes('RESEND') || key.includes('SUPABASE') || key.includes('INBOUND')
      )
    };

    console.log("🔍 Environment Debug Info:", JSON.stringify(debugInfo, null, 2));

    return new Response(JSON.stringify({
      success: true,
      debug_info: debugInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Debug function error:", message);
    
    return new Response(JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});