import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== AUTH EMAIL FUNCTION (BACKGROUND TASK) ===");
    
    const body = await req.json();
    console.log("Request received");
    
    // Initialize Resend early
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("NEW_RESEND_API_KEY not found");
      throw new Error("Email service not configured");
    }
    
    const resend = new Resend(resendApiKey);
    console.log("Resend initialized");
    
    // Get application URL from environment, fallback to production
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
    const isProduction = applicationUrl.includes('housinghub.app');
    
    // Extract email and create confirmation URL with proper token
    let userEmail = "";
    let confirmationUrl = "";
    
    if (body.user?.email) {
      userEmail = body.user.email;
      const token = body.email_data?.token_hash || body.email_data?.token || "";
      const emailType = body.email_data?.email_action_type || "signup";
      
      // Use environment-aware redirect URL
      let redirectTo = body.email_data?.redirect_to;
      if (!redirectTo) {
        // Default based on environment and email type
        const defaultPath = emailType === "recovery" ? "/setup-password" : "/email-confirm";
        redirectTo = `${applicationUrl}${defaultPath}`;
      }
      
      confirmationUrl = `https://ltjlswzrdgtoddyqmydo.supabase.co/auth/v1/verify?token=${token}&type=${emailType}&redirect_to=${encodeURIComponent(redirectTo)}`;
    } else if (body.record?.email) {
      userEmail = body.record.email;
      confirmationUrl = body.record.confirmation_url || `${applicationUrl}/email-confirm`;
    }
    
    if (!userEmail) {
      console.log("No email found in request");
      return new Response(JSON.stringify({ success: true, message: "No email to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    console.log(`Queuing email to: ${userEmail}`);
    
    // Get email type to determine which template to use
    const emailType = body.email_data?.email_action_type || "signup";
    console.log(`Email type: ${emailType}`);
    
    // Define background email sending task with extended timeout and retry
    const sendEmailTask = async () => {
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          console.log(`Attempting to send email to ${userEmail} (${4 - retries}/3)...`);
          
          // Determine subject and HTML based on email type
          let subject = "";
          let html = "";
          
          if (emailType === "recovery") {
            // Password Reset Email
            subject = "Reset your Housing Hub password";
            html = `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <h1 style="color: #333; margin-bottom: 10px; font-size: 28px;">Password Reset Request</h1>
                      <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Reset your Housing Hub account password</p>
                      
                      <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                        We received a request to reset the password for your Housing Hub account.
                      </p>
                      
                      <p style="color: #333; font-size: 16px; margin-bottom: 30px;">
                        Click the button below to create a new password. This link will expire in 1 hour for security reasons.
                      </p>
                      
                      <div style="text-align: center; margin: 35px 0;">
                        <a href="${confirmationUrl}" 
                           style="background-color: #4CAF50; 
                                  color: white; 
                                  padding: 14px 32px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  display: inline-block;
                                  font-size: 16px;
                                  font-weight: 600;
                                  box-shadow: 0 2px 4px rgba(76,175,80,0.3);">
                          Reset Password
                        </a>
                      </div>
                      
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                          <strong>Security Notice:</strong><br/>
                          This password reset link is valid for 1 hour only. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                        </p>
                      </div>
                      
                      <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        If the button above doesn't work, copy and paste this URL into your browser:
                      </p>
                      <p style="word-break: break-all; font-size: 12px; color: #999; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">
                        ${confirmationUrl}
                      </p>
                      
                      <p style="color: #999; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                      <p>© ${new Date().getFullYear()} Housing Hub. All rights reserved.</p>
                      <p>Making property management simple and efficient.</p>
                    </div>
                  </div>
                </body>
              </html>
            `;
          } else {
            // Signup Confirmation Email (default)
            subject = "Confirm your Housing Hub account";
            html = `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <h1 style="color: #333; margin-bottom: 10px; font-size: 28px;">Welcome to Housing Hub!</h1>
                      <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Your all-in-one property management solution</p>
                      
                      <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                        Thank you for signing up! We're excited to have you on board.
                      </p>
                      
                      <p style="color: #333; font-size: 16px; margin-bottom: 30px;">
                        To get started and access all features of Housing Hub, please confirm your email address by clicking the button below:
                      </p>
                      
                      <div style="text-align: center; margin: 35px 0;">
                        <a href="${confirmationUrl}" 
                           style="background-color: #4CAF50; 
                                  color: white; 
                                  padding: 14px 32px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  display: inline-block;
                                  font-size: 16px;
                                  font-weight: 600;
                                  box-shadow: 0 2px 4px rgba(76,175,80,0.3);">
                          Confirm Email Address
                        </a>
                      </div>
                      
                      <div style="background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px; margin: 30px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #666; font-size: 14px;">
                          <strong>What happens next?</strong><br/>
                          Once you confirm your email, you'll be able to access your Housing Hub dashboard where you can manage properties, track maintenance requests, and communicate with tenants seamlessly.
                        </p>
                      </div>
                      
                      <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        If the button above doesn't work, copy and paste this URL into your browser:
                      </p>
                      <p style="word-break: break-all; font-size: 12px; color: #999; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">
                        ${confirmationUrl}
                      </p>
                      
                      <p style="color: #999; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        If you didn't create an account with Housing Hub, please ignore this email.
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                      <p>© ${new Date().getFullYear()} Housing Hub. All rights reserved.</p>
                      <p>Making property management simple and efficient.</p>
                    </div>
                  </div>
                </body>
              </html>
            `;
          }
          
          const emailPromise = resend.emails.send({
            from: "Housing Hub <noreply@housinghub.app>",
            to: [userEmail],
            subject: subject,
            html: html,
          });
          
          // Extended timeout: 15 seconds
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Email timeout after 15s")), 15000)
          );
          
          const emailResponse = await Promise.race([emailPromise, timeoutPromise]);
          
          console.log(`✅ Email sent successfully to ${userEmail}. Email ID: ${(emailResponse as any)?.data?.id}`);
          return;
          
        } catch (error: any) {
          lastError = error;
          retries--;
          console.error(`❌ Email send attempt failed: ${error.message}. Retries left: ${retries}`);
          
          if (retries > 0) {
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // All retries exhausted
      console.error(`🚨 CRITICAL: Failed to send email to ${userEmail} after 3 attempts. Last error: ${lastError?.message}`);
    };
    
    // Use EdgeRuntime.waitUntil to run email sending in background
    // This allows the webhook to return immediately while email continues processing
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(sendEmailTask());
      console.log("Background email task queued successfully");
    } else {
      // Fallback: send synchronously if EdgeRuntime not available
      console.log("EdgeRuntime not available, sending email synchronously");
      await sendEmailTask();
    }
    
    // Return immediate success response to Supabase webhook
    return new Response(JSON.stringify({ 
      success: true,
      message: "Email queued for delivery",
      timestamp: new Date().toISOString(),
      recipient: userEmail
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("Email function setup error:", error.message);
    
    // Return error status so Supabase knows there was a problem
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

// Handle shutdown gracefully
addEventListener('beforeunload', (ev) => {
  console.log('Email function shutdown:', ev.detail?.reason);
});