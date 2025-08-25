
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface CommentNotificationRequest {
  recipient_email: string;
  recipient_name: string;
  notification_data: {
    request_id: string;
    request_title: string;
    request_description: string;
    request_location: string;
    request_priority: string;
    request_status: string;
    property_name?: string;
    property_address?: string;
    comment_text: string;
    commenter_name: string;
    commenter_role: string;
    comment_date: string;
    direct_link: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Comment notification function called");
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body received:", requestBody);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: parseError.message 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const { recipient_email, recipient_name, notification_data }: CommentNotificationRequest = requestBody;
    
    if (!recipient_email || !notification_data) {
      console.error("Missing required fields:", { recipient_email: !!recipient_email, notification_data: !!notification_data });
      return new Response(JSON.stringify({ 
        error: "Missing required fields: recipient_email and notification_data are required" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Check for Resend API key (try multiple possible secret names)
    let resendApiKey = Deno.env.get("RESEND_API_KEY") || 
                       Deno.env.get("NEW_RESEND_API_KEY") || 
                       Deno.env.get("RESEND_API_KEY_1");
    
    console.log("Available env vars:", {
      RESEND_API_KEY: !!Deno.env.get("RESEND_API_KEY"),
      NEW_RESEND_API_KEY: !!Deno.env.get("NEW_RESEND_API_KEY"),
      RESEND_API_KEY_1: !!Deno.env.get("RESEND_API_KEY_1"),
      finalKey: !!resendApiKey
    });
    
    if (!resendApiKey) {
      console.error("No Resend API key found in environment variables");
      return new Response(JSON.stringify({ 
        error: "Server configuration error: Missing email service API key",
        debug: "Checked RESEND_API_KEY, NEW_RESEND_API_KEY, and RESEND_API_KEY_1"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Initialize Resend client
    const resend = new Resend(resendApiKey);
    
    console.log("Sending notification to:", recipient_email);
    console.log("Comment data:", notification_data);

    // Format the comment date
    const commentDate = new Date(notification_data.comment_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create the email content
    const emailSubject = `New Comment on Request: ${notification_data.request_title}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Comment Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">New Comment on Maintenance Request</h1>
            <p>Hello ${recipient_name},</p>
            <p>A new comment has been added to a maintenance request that you're involved with.</p>
          </div>

          <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Request Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Title:</td>
                <td style="padding: 8px 0;">${notification_data.request_title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                <td style="padding: 8px 0;">${notification_data.request_location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: ${notification_data.request_priority === 'high' ? '#fee2e2' : notification_data.request_priority === 'medium' ? '#fef3c7' : '#ecfdf5'}; 
                               color: ${notification_data.request_priority === 'high' ? '#dc2626' : notification_data.request_priority === 'medium' ? '#d97706' : '#059669'}; 
                               padding: 2px 8px; border-radius: 4px; text-transform: capitalize;">
                    ${notification_data.request_priority}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0; text-transform: capitalize;">${notification_data.request_status}</td>
              </tr>
              ${notification_data.property_name ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Property:</td>
                <td style="padding: 8px 0;">${notification_data.property_name}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #0c4a6e; margin-top: 0;">New Comment</h3>
            <div style="margin-bottom: 12px;">
              <strong>${notification_data.commenter_name}</strong>
              <span style="color: #6b7280; font-size: 14px;">(${notification_data.commenter_role})</span>
              <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">${commentDate}</span>
            </div>
            <div style="background-color: #fff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
              <p style="margin: 0; white-space: pre-wrap;">${notification_data.comment_text}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification_data.direct_link}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Request Details
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your maintenance management system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Maintenance System <notifications@housinghub.app>", // Use verified custom domain
      to: [recipient_email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Comment notification email sent successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-comment-notification function:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.stack 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);
