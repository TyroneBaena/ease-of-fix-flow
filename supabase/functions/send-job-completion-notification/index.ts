import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface JobCompletionNotificationRequest {
  recipient_email: string;
  recipient_name: string;
  notification_data: {
    request_id: string;
    request_title: string;
    request_description: string;
    request_location: string;
    request_priority: string;
    property_name?: string;
    property_address?: string;
    contractor_name: string;
    completion_photos?: Array<{ url: string }>;
    completion_date: string;
    direct_link: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Job completion notification function called");
    
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const { recipient_email, recipient_name, notification_data }: JobCompletionNotificationRequest = await req.json();
    
    if (!recipient_email || !notification_data) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: recipient_email and notification_data are required" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Get Resend API key - use NEW_RESEND_API_KEY consistently
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("NEW_RESEND_API_KEY not found");
      return new Response(JSON.stringify({ 
        error: "Server configuration error: NEW_RESEND_API_KEY not configured"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const resend = new Resend(resendApiKey);
    
    // Format the completion date
    const completionDate = new Date(notification_data.completion_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const photosSection = notification_data.completion_photos && notification_data.completion_photos.length > 0 
      ? `
        <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #0c4a6e; margin-top: 0;">Completion Photos (${notification_data.completion_photos.length})</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
            ${notification_data.completion_photos.map((photo, index) => `
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <img src="${photo.url}" alt="Completion photo ${index + 1}" style="width: 100%; height: 150px; object-fit: cover; display: block;">
                <div style="padding: 8px; background-color: #fff; font-size: 12px; color: #6b7280; text-align: center;">
                  Photo ${index + 1}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : '';

    // Create the email content
    const emailSubject = `Job Completed: ${notification_data.request_title}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Job Completion Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">✅ Job Completed</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Maintenance work has been finished</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p>Hello ${recipient_name},</p>
            <p>Great news! The maintenance job for <strong>"${notification_data.request_title}"</strong> has been completed by ${notification_data.contractor_name}.</p>
          </div>

          <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Job Details</h2>
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
                <td style="padding: 8px 0; font-weight: bold;">Contractor:</td>
                <td style="padding: 8px 0;">${notification_data.contractor_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Completed:</td>
                <td style="padding: 8px 0;">${completionDate}</td>
              </tr>
              ${notification_data.property_name ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Property:</td>
                <td style="padding: 8px 0;">${notification_data.property_name}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${photosSection}

          <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #047857; margin-top: 0;">Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px; color: #065f46;">
              <li>Review the completion photos to ensure work quality</li>
              <li>Check if an invoice has been submitted</li>
              <li>Close the maintenance request if satisfied</li>
              <li>Provide feedback if needed</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification_data.direct_link}" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Completed Job
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your maintenance management system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    // Send the email using verified domain
    const emailResponse = await resend.emails.send({
      from: "Property Manager <notifications@housinghub.app>",
      to: [recipient_email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Job completion email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Job completion notification email sent successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-job-completion-notification function:", error);
    
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

Deno.serve(handler);