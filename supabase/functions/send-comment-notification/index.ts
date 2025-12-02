import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationData {
  request_id: string;
  request_title: string;
  request_description: string;
  request_location: string;
  request_priority: string;
  request_status: string;
  property_name: string;
  property_address: string;
  comment_text: string;
  commenter_name: string;
  commenter_role: string;
  comment_date: string;
  direct_link: string;
}

interface EmailRequest {
  recipient_email: string;
  recipient_name: string;
  notification_data: NotificationData;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY") || 
                         Deno.env.get("RESEND_API_KEY") || 
                         Deno.env.get("RESEND_API_KEY_1");
    if (!resendApiKey) {
      console.error("Missing Resend API key (checked NEW_RESEND_API_KEY, RESEND_API_KEY, RESEND_API_KEY_1)");
      throw new Error("Email service configuration is missing");
    }

    const { recipient_email, recipient_name, notification_data }: EmailRequest = await req.json();

    if (!recipient_email || !notification_data) {
      throw new Error("Missing required email parameters");
    }

    const resend = new Resend(resendApiKey);
    console.log(`Sending comment notification email to ${recipient_email}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Comment</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">💬 New Comment Added</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">by ${notification_data.commenter_name}</p>
          </div>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #065f46;">Comment</h3>
            <p><strong>From:</strong> ${notification_data.commenter_name} (${notification_data.commenter_role})</p>
            <blockquote style="border-left: 3px solid #d1d5db; padding-left: 15px; margin: 10px 0; font-style: italic; color: #374151;">
              ${notification_data.comment_text}
            </blockquote>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #334155;">Request Details</h3>
            <p><strong>Title:</strong> ${notification_data.request_title}</p>
            <p><strong>Location:</strong> ${notification_data.request_location}</p>
            <p><strong>Priority:</strong> 
              <span style="background-color: ${notification_data.request_priority === 'high' || notification_data.request_priority === 'critical' ? '#fee2e2' : notification_data.request_priority === 'medium' ? '#fef3c7' : '#ecfdf5'}; 
                          color: ${notification_data.request_priority === 'high' || notification_data.request_priority === 'critical' ? '#dc2626' : notification_data.request_priority === 'medium' ? '#d97706' : '#059669'}; 
                          padding: 2px 8px; border-radius: 4px; text-transform: capitalize;">
                ${notification_data.request_priority}
              </span>
            </p>
            <p><strong>Status:</strong> ${notification_data.request_status}</p>
            ${notification_data.property_name ? `<p><strong>Property:</strong> ${notification_data.property_name}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification_data.direct_link}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              View Request & Respond
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>HousingHub - Property Management Made Simple</p>
            <p>This is an automated notification from your maintenance management system.</p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'HousingHub <notifications@housinghub.app>',
      to: [recipient_email],
      subject: `New Comment from ${notification_data.commenter_name}: ${notification_data.request_title}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Error sending email via Resend:", error);
      throw error;
    }

    console.log(`Email sent successfully to ${recipient_email}, EmailID: ${data?.id}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      email_id: data?.id,
      recipient: recipient_email 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-comment-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
