import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  email: string;
  name?: string;
  confirmationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, confirmationUrl }: SendEmailRequest = await req.json();
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("Resend API key not configured");
    }

    const resend = new Resend(resendApiKey);

    const result = await resend.emails.send({
      from: "HousingHub <noreply@housinghub.app>",
      to: [email],
      subject: "Confirm your HousingHub account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937;">Welcome to HousingHub!</h1>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-top: 0;">Confirm Your Email</h2>
            <p style="color: #4b5563;">Hi${name ? ` ${name}` : ''},</p>
            <p style="color: #4b5563;">Please confirm your email address to complete your registration:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${confirmationUrl}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Confirm Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px;">
              If the button doesn't work, copy this link: <br>
              <a href="${confirmationUrl}" style="color: #3b82f6;">${confirmationUrl}</a>
            </p>
          </div>
          
          <p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 HousingHub</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: result.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);