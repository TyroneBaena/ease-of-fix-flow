import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const handler = async (req: Request): Promise<Response> => {
  console.log("=== INSTANT RESPONSE FUNCTION ===");
  
  // CORS
  if (req.method === "OPTIONS") {
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
    // Read body but don't parse it to avoid delays
    const body = await req.text();
    console.log("Body received, length:", body.length);
    
    // Return success IMMEDIATELY - no email logic at all
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook received successfully",
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
    console.error("Error:", error);
    
    // Even on error, return 200 to prevent retries
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
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
  }
};

serve(handler);