import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteNotificationRequest {
  quote_id: string;
  notification_type: 'submitted' | 'approved' | 'rejected' | 'requested' | 'assigned';
  recipient_email: string;
  recipient_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY") || 
                         Deno.env.get("RESEND_API_KEY") || 
                         Deno.env.get("RESEND_API_KEY_1");
    if (!resendApiKey) {
      throw new Error("Resend API key not configured (checked NEW_RESEND_API_KEY, RESEND_API_KEY, RESEND_API_KEY_1)");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { quote_id, notification_type, recipient_email, recipient_name }: QuoteNotificationRequest = await req.json();
    
    if (!quote_id || !notification_type || !recipient_email) {
      throw new Error("Missing required fields");
    }

    console.log(`Sending ${notification_type} notification for quote:`, quote_id);

    // Fetch quote with related data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        maintenance_requests (
          id,
          title,
          description,
          location,
          priority,
          organization_id,
          attachments,
          properties (
            name,
            address
          )
        ),
        contractors (
          company_name,
          contact_name,
          organization_id
        )
      `)
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote data:', quoteError);
      throw new Error('Failed to fetch quote details');
    }

    // Verify organization boundaries
    if (quote.maintenance_requests?.organization_id !== quote.contractors?.organization_id) {
      console.error('SECURITY: Organization mismatch in quote notification');
      throw new Error('Security violation: Organization boundary mismatch');
    }

    const request = quote.maintenance_requests;
    const contractor = quote.contractors;
    const property = request?.properties;

    // Generate email content based on notification type
    let subject: string;
    let emailHtml: string;
    const directLink = `${Deno.env.get('APPLICATION_URL') || 'https://housinghub.app'}/requests/${request?.id}`;

    switch (notification_type) {
      case 'assigned':
        subject = `🛠️ Job Assignment: ${request?.title}`;
        emailHtml = createJobAssignmentEmail(recipient_name, request, property, directLink);
        break;
      case 'requested':
        subject = `Quote Request: ${request?.title}`;
        emailHtml = createQuoteRequestEmail(recipient_name, request, property, directLink);
        break;
      case 'submitted':
        subject = `Quote Submitted: ${request?.title}`;
        emailHtml = createQuoteSubmittedEmail(recipient_name, quote, request, contractor, property, directLink);
        break;
      case 'approved':
        subject = `Quote Approved: ${request?.title}`;
        emailHtml = createQuoteApprovedEmail(recipient_name, quote, request, contractor, property, directLink);
        break;
      case 'rejected':
        subject = `Quote Status Update: ${request?.title}`;
        emailHtml = createQuoteRejectedEmail(recipient_name, quote, request, contractor, property, directLink);
        break;
      default:
        throw new Error(`Invalid notification type: ${notification_type}`);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "HousingHub <notifications@housinghub.app>",
      to: [recipient_email],
      subject,
      html: emailHtml,
    });

    console.log("Quote notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${notification_type} notification sent successfully`,
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-quote-notification function:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

// NEW: Job Assignment Email - sent when contractor is assigned to a job
function createJobAssignmentEmail(recipientName: string, request: any, property: any, directLink: string): string {
  // Parse attachments for photos
  let attachments: any[] = [];
  if (request?.attachments) {
    try {
      attachments = typeof request.attachments === 'string' 
        ? JSON.parse(request.attachments) 
        : request.attachments;
    } catch (e) {
      console.error('Error parsing attachments:', e);
    }
  }

  // Filter for image attachments
  const imageAttachments = attachments.filter(att => {
    const url = att?.url || att;
    return typeof url === 'string' && (
      url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
      url.includes('/object/public/')
    );
  });

  // Generate photos HTML
  let photosHtml = '';
  if (imageAttachments.length > 0) {
    const photoItems = imageAttachments.slice(0, 6).map(att => {
      const url = att?.url || att;
      return `
        <td style="width: 50%; padding: 4px; vertical-align: top;">
          <img src="${url}" alt="Job photo" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb;" />
        </td>
      `;
    });

    // Create rows with 2 images each
    const rows = [];
    for (let i = 0; i < photoItems.length; i += 2) {
      rows.push(`<tr>${photoItems[i]}${photoItems[i + 1] || '<td></td>'}</tr>`);
    }

    photosHtml = `
      <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #1f2937; margin-top: 0;">📸 Job Photos</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${rows.join('')}
        </table>
        ${imageAttachments.length > 6 ? `<p style="color: #6b7280; font-size: 14px; margin-top: 10px;">+ ${imageAttachments.length - 6} more photos available in the system</p>` : ''}
      </div>
    `;
  }

  // Priority color mapping
  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'high':
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'medium':
        return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      case 'low':
      default:
        return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    }
  };

  const priorityStyle = getPriorityStyle(request?.priority);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Assignment</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px;">🛠️ Job Assigned</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">You've been assigned to a maintenance job</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;">Hello <strong>${recipientName}</strong>,</p>
          <p style="margin: 0;">You have been assigned to work on the following maintenance request. Please review the details below and proceed with the job.</p>
        </div>

        <!-- Priority Banner -->
        <div style="background-color: ${priorityStyle.bg}; border: 1px solid ${priorityStyle.border}; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
          <span style="color: ${priorityStyle.color}; font-weight: bold; font-size: 14px; text-transform: uppercase;">
            ⚡ ${request?.priority || 'Normal'} Priority
          </span>
        </div>

        <!-- Job Details -->
        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📋 Job Details</h2>
          
          <div style="margin-bottom: 16px;">
            <p style="font-weight: bold; color: #374151; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase;">Nature of Request</p>
            <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 600;">${request?.title || 'N/A'}</p>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="font-weight: bold; color: #374151; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase;">Description</p>
            <p style="margin: 0; color: #4b5563; background-color: #f9fafb; padding: 12px; border-radius: 6px; border-left: 4px solid #10b981;">${request?.description || 'No description provided'}</p>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="font-weight: bold; color: #374151; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase;">Location</p>
            <p style="margin: 0; color: #4b5563;">${request?.location || 'N/A'}</p>
          </div>
        </div>

        <!-- Property Details -->
        ${property ? `
        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🏠 Property Information</h2>
          
          ${property.name ? `
          <div style="margin-bottom: 12px;">
            <p style="font-weight: bold; color: #374151; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase;">Property Name</p>
            <p style="margin: 0; color: #1f2937; font-size: 16px;">${property.name}</p>
          </div>
          ` : ''}
          
          ${property.address ? `
          <div style="margin-bottom: 0;">
            <p style="font-weight: bold; color: #374151; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase;">Address</p>
            <p style="margin: 0; color: #1f2937; font-size: 16px;">📍 ${property.address}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Photos Section -->
        ${photosHtml}

        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
            View Job Details
          </a>
        </div>

        <!-- Next Steps -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #166534; margin-top: 0;">✅ Next Steps</h3>
          <ul style="margin: 0; padding-left: 20px; color: #15803d;">
            <li style="margin-bottom: 8px;">Review the job details and photos</li>
            <li style="margin-bottom: 8px;">Schedule your visit to the property</li>
            <li style="margin-bottom: 8px;">Complete the work and update progress</li>
            <li style="margin-bottom: 0;">Upload completion photos when finished</li>
          </ul>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0 0 8px 0;">This is an automated notification from your maintenance management system.</p>
          <p style="margin: 0;">If you have any questions, please contact the property manager.</p>
        </div>
      </body>
    </html>
  `;
}

function createQuoteRequestEmail(recipientName: string, request: any, property: any, directLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📋 Quote Request</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">New maintenance work available</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${recipientName},</p>
          <p>You have been requested to provide a quote for the following maintenance work:</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Request Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Title:</td>
              <td style="padding: 8px 0;">${request?.title || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Description:</td>
              <td style="padding: 8px 0;">${request?.description || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0;">${request?.location || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${request?.priority === 'high' ? '#fee2e2' : request?.priority === 'medium' ? '#fef3c7' : '#ecfdf5'}; 
                             color: ${request?.priority === 'high' ? '#dc2626' : request?.priority === 'medium' ? '#d97706' : '#059669'}; 
                             padding: 2px 8px; border-radius: 4px; text-transform: capitalize;">
                  ${request?.priority || 'N/A'}
                </span>
              </td>
            </tr>
            ${property?.name ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Property:</td>
              <td style="padding: 8px 0;">${property.name}</td>
            </tr>
            ` : ''}
            ${property?.address ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Address:</td>
              <td style="padding: 8px 0;">${property.address}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Request & Submit Quote
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Please review the request details and submit your quote through the system.</p>
          <p>This is an automated notification from your maintenance management system.</p>
        </div>
      </body>
    </html>
  `;
}

function createQuoteSubmittedEmail(recipientName: string, quote: any, request: any, contractor: any, property: any, directLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote Submitted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">💰 Quote Submitted</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">New quote ready for review</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${recipientName},</p>
          <p>A quote has been submitted for maintenance request <strong>"${request?.title}"</strong>.</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Quote Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Contractor:</td>
              <td style="padding: 8px 0;">${contractor?.company_name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
              <td style="padding: 8px 0; font-size: 18px; color: #059669; font-weight: bold;">$${quote?.amount ? Number(quote.amount).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
              <td style="padding: 8px 0;">${new Date(quote?.submitted_at || Date.now()).toLocaleDateString()}</td>
            </tr>
            ${quote?.description ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Notes:</td>
              <td style="padding: 8px 0;">${quote.description}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Review & Approve Quote
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Please review the quote and take appropriate action.</p>
          <p>This is an automated notification from your maintenance management system.</p>
        </div>
      </body>
    </html>
  `;
}

function createQuoteApprovedEmail(recipientName: string, quote: any, request: any, contractor: any, property: any, directLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote Approved</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #059669; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">✅ Quote Approved</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">You can now proceed with the work</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${recipientName},</p>
          <p>Great news! Your quote for <strong>"${request?.title}"</strong> has been approved.</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Approved Quote Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Amount:</td>
              <td style="padding: 8px 0; font-size: 18px; color: #059669; font-weight: bold;">$${quote?.amount ? Number(quote.amount).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Approved:</td>
              <td style="padding: 8px 0;">${new Date(quote?.approved_at || Date.now()).toLocaleDateString()}</td>
            </tr>
            ${property?.name ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Property:</td>
              <td style="padding: 8px 0;">${property.name}</td>
            </tr>
            ` : ''}
            ${property?.address ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Address:</td>
              <td style="padding: 8px 0;">${property.address}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #047857; margin-top: 0;">Next Steps</h3>
          <ul style="margin: 0; padding-left: 20px; color: #065f46;">
            <li>Schedule the work at your earliest convenience</li>
            <li>Keep the property manager updated on progress</li>
            <li>Upload completion photos when finished</li>
            <li>Submit your invoice upon completion</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Job Details
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your maintenance management system.</p>
        </div>
      </body>
    </html>
  `;
}

function createQuoteRejectedEmail(recipientName: string, quote: any, request: any, contractor: any, property: any, directLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #6b7280; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📋 Quote Status Update</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Update on your submitted quote</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${recipientName},</p>
          <p>Thank you for submitting a quote for <strong>"${request?.title}"</strong>. The property manager has decided to proceed with a different contractor for this request.</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Quote Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Your Quote:</td>
              <td style="padding: 8px 0;">$${quote?.amount ? Number(quote.amount).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
              <td style="padding: 8px 0;">${new Date(quote?.submitted_at || Date.now()).toLocaleDateString()}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0; color: #374151;">We appreciate your time and effort in preparing this quote. We hope to work with you on future opportunities.</p>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your maintenance management system.</p>
        </div>
      </body>
    </html>
  `;
}

serve(handler);
