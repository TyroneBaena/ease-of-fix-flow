import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve((req: Request) => {
  console.log("=== WEBHOOK RECEIVED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  return new Response(JSON.stringify({ 
    success: true,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
  });
});