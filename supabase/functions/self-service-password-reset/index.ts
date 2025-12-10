import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a secure temporary password - safe character set (no HTML-problematic or ambiguous chars)
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== SELF-SERVICE PASSWORD RESET FUNCTION ===");
    
    // Parse request body
    const { email } = await req.json();
    
    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ success: false, message: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password reset requested for: ${email}`);

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Find user by email in auth.users
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a password reset email will be sent." }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.log(`No user found with email: ${email}`);
      // Return success even if user doesn't exist (security best practice)
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a password reset email will be sent." }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found user: ${user.id}`);

    // Get user profile to get organization name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, organization_id')
      .eq('id', user.id)
      .single();

    let organizationName = "HousingHub";
    if (profile?.organization_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single();
      if (org?.name) {
        organizationName = org.name;
      }
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    console.log(`Generated temporary password for ${email}`);

    // Update user's password using admin privileges
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to reset password. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set must_change_password flag
    const { error: flagError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', user.id);

    if (flagError) {
      console.warn("Warning: Could not set must_change_password flag:", flagError);
    }

    console.log(`Password updated and must_change_password flag set for ${email}`);

    // Send email with temporary password
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY_1");
    
    if (!resendApiKey) {
      console.error("No Resend API key found");
      return new Response(
        JSON.stringify({ success: false, message: "Email service configuration error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const loginUrl = "https://housinghub.app/login";
    const userName = profile?.name || email.split('@')[0];
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${organizationName}</h1>
            <p style="color: #e0e0e0; margin: 10px 0 0 0;">Password Reset</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1e3a5f; margin-top: 0;">Hello ${userName},</h2>
            
            <p>We received a request to reset your password for your HousingHub account.</p>
            
            <p>Your temporary password is:</p>
            
            <div style="background: #fff; border: 2px dashed #1e3a5f; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <code style="font-size: 24px; font-weight: bold; color: #1e3a5f; letter-spacing: 2px;">${tempPassword}</code>
            </div>
            
            <p style="color: #dc2626; font-weight: 500;">⚠️ You will be required to set a new password when you log in.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In Now</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please contact your administrator immediately.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message from HousingHub.<br>
              Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${organizationName} <onboarding@housinghub.app>`,
      to: [email],
      subject: `${organizationName} - Your HousingHub Password Reset`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to send password reset email. Please try again." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Password reset email sent successfully to ${email}. Email ID: ${emailData?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password reset email sent successfully",
        emailId: emailData?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Self-service password reset error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
