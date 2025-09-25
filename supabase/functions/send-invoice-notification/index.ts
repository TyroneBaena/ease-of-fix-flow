import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceNotificationRequest {
  invoice_id: string;
  notification_type: 'uploaded' | 'approved' | 'rejected';
  recipient_email: string;
  recipient_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("NEW_RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { invoice_id, notification_type, recipient_email, recipient_name }: InvoiceNotificationRequest = await req.json();
    
    if (!invoice_id || !notification_type || !recipient_email) {
      throw new Error("Missing required fields");
    }

    console.log(`Sending ${notification_type} notification for invoice:`, invoice_id);

    // Fetch invoice with related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        maintenance_requests (
          id,
          title,
          description,
          location,
          organization_id,
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
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice data:', invoiceError);
      throw new Error('Failed to fetch invoice details');
    }

    // Verify organization boundaries
    if (invoice.maintenance_requests?.organization_id !== invoice.contractors?.organization_id) {
      console.error('SECURITY: Organization mismatch in invoice notification');
      throw new Error('Security violation: Organization boundary mismatch');
    }

    const request = invoice.maintenance_requests;
    const contractor = invoice.contractors;
    const property = request?.properties;

    // Generate email content based on notification type
    let subject: string;
    let emailHtml: string;
    const directLink = `${Deno.env.get('APPLICATION_URL') || 'https://housinghub.app'}/requests/${request?.id}`;

    switch (notification_type) {
      case 'uploaded':
        subject = `Invoice Submitted: ${request?.title}`;
        emailHtml = createInvoiceUploadedEmail(recipient_name, invoice, request, contractor, property, directLink);
        break;
      case 'approved':
        subject = `Invoice Approved: ${request?.title}`;
        emailHtml = createInvoiceApprovedEmail(recipient_name, invoice, request, contractor, property, directLink);
        break;
      case 'rejected':
        subject = `Invoice Status Update: ${request?.title}`;
        emailHtml = createInvoiceRejectedEmail(recipient_name, invoice, request, contractor, property, directLink);
        break;
      default:
        throw new Error(`Invalid notification type: ${notification_type}`);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Property Manager <notifications@housinghub.app>",
      to: [recipient_email],
      subject,
      html: emailHtml,
    });

    console.log("Invoice notification email sent successfully:", emailResponse);

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
    console.error("Error in send-invoice-notification function:", error);
    
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

function createInvoiceUploadedEmail(recipientName: string, invoice: any, request: any, contractor: any, property: any, directLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Submitted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🧾 Invoice Submitted</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Job completed - invoice ready for review</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${recipientName},</p>
          <p>An invoice has been submitted for the completed maintenance work: <strong>"${request?.title}"</strong>.</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Invoice Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Invoice #:</td>
              <td style="padding: 8px 0;">${invoice?.invoice_number || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Contractor:</td>
              <td style="padding: 8px 0;">${contractor?.company_name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Final Cost:</td>
              <td style="padding: 8px 0;">$${invoice?.final_cost ? Number(invoice.final_cost).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">GST:</td>
              <td style="padding: 8px 0;">$${invoice?.gst_amount ? Number(invoice.gst_amount).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-top: 2px solid #e5e7eb;">Total (inc GST):</td>
              <td style="padding: 8px 0; font-size: 18px; color: #059669; font-weight: bold; border-top: 2px solid #e5e7eb;">$${invoice?.total_amount_with_gst ? Number(invoice.total_amount_with_gst).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Uploaded:</td>
              <td style="padding: 8px 0;">${new Date(invoice?.uploaded_at || Date.now()).toLocaleDateString()}</td>
            </tr>
            ${property?.name ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Property:</td>
              <td style="padding: 8px 0;">${property.name}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #92400e; margin-top: 0;">📋 Review Required</h3>
          <p style="margin: 0; color: #92400e;">This invoice requires your review and approval for payment processing.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Review Invoice
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Please review the invoice details and approve for payment.</p>
          <p>This is an automated notification from your maintenance management system.</p>
        </div>
      </body>
    </html>
  `;
}

function createInvoiceApprovedEmail(recipientName: string, invoice: any, request: any, contractor: any, property: any, directLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Approved</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #059669; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">✅ Invoice Approved</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Payment will be processed soon</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${recipientName},</p>
          <p>Great news! Your invoice for <strong>"${request?.title}"</strong> has been approved for payment.</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Approved Invoice</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Invoice #:</td>
              <td style="padding: 8px 0;">${invoice?.invoice_number || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
              <td style="padding: 8px 0; font-size: 18px; color: #059669; font-weight: bold;">$${invoice?.total_amount_with_gst ? Number(invoice.total_amount_with_gst).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Approved:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #047857; margin-top: 0;">💰 Payment Processing</h3>
          <p style="margin: 0; color: #065f46;">Your invoice has been approved and will be processed for payment according to our standard payment terms.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
             View Job Details
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Thank you for your excellent work on this maintenance request.</p>
          <p>This is an automated notification from your maintenance management system.</p>
        </div>
      </body>
    </html>
  `;
}

function createInvoiceRejectedEmail(recipientName: string, invoice: any, request: any, contractor: any, property: any, directLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Invoice Update Required</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Action needed on your invoice</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${recipientName},</p>
          <p>Your invoice for <strong>"${request?.title}"</strong> requires some updates before it can be approved for payment.</p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Invoice Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Invoice #:</td>
              <td style="padding: 8px 0;">${invoice?.invoice_number || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
              <td style="padding: 8px 0;">$${invoice?.total_amount_with_gst ? Number(invoice.total_amount_with_gst).toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
              <td style="padding: 8px 0;">${new Date(invoice?.uploaded_at || Date.now()).toLocaleDateString()}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fee2e2; border: 1px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #dc2626; margin-top: 0;">📋 Action Required</h3>
          <p style="margin: 0; color: #991b1b;">Please contact the property manager to clarify the required updates to your invoice.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Job Details
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Please reach out to resolve any questions about your invoice.</p>
          <p>This is an automated notification from your maintenance management system.</p>
        </div>
      </body>
    </html>
  `;
}

serve(handler);