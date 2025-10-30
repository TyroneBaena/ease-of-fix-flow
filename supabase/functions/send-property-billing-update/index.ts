import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("NEW_RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PropertyBillingUpdateRequest {
  recipient_email: string;
  recipient_name: string;
  property_count: number;
  old_property_count: number;
  monthly_amount: number;
  old_monthly_amount: number;
  change_type: 'added' | 'removed';
  properties_changed: number;
  next_billing_date: string;
  prorated_amount?: number;
  is_trial: boolean;
  is_subscribed: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';

    const {
      recipient_email,
      recipient_name,
      property_count,
      old_property_count,
      monthly_amount,
      old_monthly_amount,
      change_type,
      properties_changed,
      next_billing_date,
      prorated_amount,
      is_trial,
      is_subscribed,
    }: PropertyBillingUpdateRequest = await req.json();

    console.log('Sending property billing update email:', { 
      recipient_email, 
      change_type, 
      properties_changed,
      is_trial,
      is_subscribed
    });

    // Format dates
    const formattedBillingDate = new Date(next_billing_date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build email content based on subscription status
    let subject: string;
    let billingInfo: string;

    if (is_trial) {
      subject = change_type === 'added' 
        ? `🏢 Property Added - Trial Billing Updated`
        : `🏢 Property Removed - Trial Billing Updated`;
      
      billingInfo = `
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 16px 0;">
          During your trial period, you've ${change_type === 'added' ? 'added' : 'removed'} 
          ${properties_changed} ${properties_changed === 1 ? 'property' : 'properties'}.
        </p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #333; font-weight: bold;">Your billing after trial ends:</p>
          <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #0066cc;">
            $${monthly_amount} AUD/month
          </p>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
            for ${property_count} ${property_count === 1 ? 'property' : 'properties'}
          </p>
        </div>
        <p style="color: #666; font-size: 14px; margin: 16px 0;">
          Your trial continues until ${formattedBillingDate}. After that, you'll be charged $${monthly_amount} AUD monthly.
        </p>
      `;
    } else if (is_subscribed) {
      subject = change_type === 'added'
        ? `🏢 Property Added - Billing Update`
        : `🏢 Property Removed - Billing Credit Applied`;

      const amountChange = Math.abs(monthly_amount - old_monthly_amount);
      
      if (change_type === 'added') {
        billingInfo = `
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 16px 0;">
            You've added ${properties_changed} ${properties_changed === 1 ? 'property' : 'properties'} to your account.
          </p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 16px; margin: 20px 0;">
            <table width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #333;">Previous monthly billing:</td>
                <td style="padding: 8px 0; text-align: right; color: #666; text-decoration: line-through;">
                  $${old_monthly_amount} AUD
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #333; font-weight: bold;">New monthly billing:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #28a745; font-size: 20px;">
                  $${monthly_amount} AUD
                </td>
              </tr>
              ${prorated_amount ? `
              <tr style="border-top: 1px solid #dee2e6;">
                <td style="padding: 8px 0; color: #333; font-size: 14px;">Prorated charge (this billing cycle):</td>
                <td style="padding: 8px 0; text-align: right; color: #0066cc; font-size: 14px;">
                  $${prorated_amount.toFixed(2)} AUD
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          <p style="color: #666; font-size: 14px; margin: 16px 0;">
            ${prorated_amount 
              ? `A prorated charge of $${prorated_amount.toFixed(2)} AUD will be added to your next invoice for the remainder of this billing cycle. `
              : ''
            }Starting ${formattedBillingDate}, you'll be charged $${monthly_amount} AUD monthly.
          </p>
        `;
      } else {
        billingInfo = `
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 16px 0;">
            You've removed ${properties_changed} ${properties_changed === 1 ? 'property' : 'properties'} from your account.
          </p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 16px; margin: 20px 0;">
            <table width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #333;">Previous monthly billing:</td>
                <td style="padding: 8px 0; text-align: right; color: #666; text-decoration: line-through;">
                  $${old_monthly_amount} AUD
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #333; font-weight: bold;">New monthly billing:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #28a745; font-size: 20px;">
                  $${monthly_amount} AUD
                </td>
              </tr>
              ${prorated_amount ? `
              <tr style="border-top: 1px solid #dee2e6;">
                <td style="padding: 8px 0; color: #333; font-size: 14px;">Credit applied (this billing cycle):</td>
                <td style="padding: 8px 0; text-align: right; color: #28a745; font-size: 14px;">
                  -$${prorated_amount.toFixed(2)} AUD
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          <p style="color: #666; font-size: 14px; margin: 16px 0;">
            ${prorated_amount 
              ? `A credit of $${prorated_amount.toFixed(2)} AUD will be applied to your next invoice for the unused portion of this billing cycle. `
              : ''
            }Starting ${formattedBillingDate}, you'll be charged $${monthly_amount} AUD monthly.
          </p>
        `;
      }
    } else {
      // Not subscribed or in trial - shouldn't happen but handle gracefully
      subject = `Property Update Notification`;
      billingInfo = `
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 16px 0;">
          You've ${change_type === 'added' ? 'added' : 'removed'} 
          ${properties_changed} ${properties_changed === 1 ? 'property' : 'properties'}.
        </p>
        <p style="color: #666; font-size: 14px; margin: 16px 0;">
          Current property count: ${property_count}
        </p>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                        Property Billing Update
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hi ${recipient_name},
                      </p>
                      
                      ${billingInfo}
                      
                      <!-- Property Summary -->
                      <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 24px 0;">
                        <h3 style="margin: 0 0 12px 0; color: #333; font-size: 18px;">Property Summary</h3>
                        <table width="100%" style="border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #666;">Total Properties:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">
                              ${property_count}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #666;">Rate per Property:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">
                              $29 AUD/month
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="${applicationUrl}/billing" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                          View Billing Details
                        </a>
                      </div>
                      
                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                        If you have any questions about your billing, please don't hesitate to contact our support team.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 24px 30px; text-align: center; border-top: 1px solid #dee2e6;">
                      <p style="color: #999; font-size: 12px; margin: 0; line-height: 1.6;">
                        This is an automated billing notification from Property Management System.<br>
                        You're receiving this because your property count has changed.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: "Property Management <billing@housinghub.app>",
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API error:', error);
      
      // Handle Resend testing mode limitation (403 error)
      if (error.statusCode === 403 && error.message?.includes('verify a domain')) {
        console.log('⚠️  Resend is in testing mode. Email would be sent to:', recipient_email);
        console.log('📧 To send emails in production, verify your domain at: https://resend.com/domains');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            testing_mode: true,
            message: 'Email skipped in testing mode. Please verify your domain on Resend.',
            recipient_email: recipient_email
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw error;
    }

    console.log('Property billing update email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-property-billing-update:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
