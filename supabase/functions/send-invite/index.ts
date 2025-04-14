
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@1.0.0";

interface InviteRequest {
  email: string;
  name: string;
  role: 'admin' | 'manager';
  assignedProperties?: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client with the admin role
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  
  try {
    // Parse request body
    const body = await req.json() as InviteRequest;
    const { email, name, role, assignedProperties = [] } = body;
    
    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Email, name, and role are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing invitation for ${email} with role ${role}`);
    
    // Check for RESEND_API_KEY and APPLICATION_URL before initialization
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const applicationUrl = Deno.env.get('APPLICATION_URL');

    console.log('Environment Checks:', {
      RESEND_API_KEY: resendApiKey ? 'Present' : 'Missing',
      APPLICATION_URL: applicationUrl ? 'Present' : 'Missing'
    });
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set in the environment variables");
      return new Response(
        JSON.stringify({ error: "Resend API Key is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!applicationUrl) {
      console.error("APPLICATION_URL is not set in the environment variables");
      return new Response(
        JSON.stringify({ error: "Application URL is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Resend with API key
    const resend = new Resend(resendApiKey);
    console.log("Resend initialized with API key");
    
    // First, check if the user already exists
    const { data: existingUsers, error: searchError } = await supabaseClient.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (searchError) {
      console.error("Error searching for existing user:", searchError);
      throw searchError;
    }
    
    let userId = '';
    let isNewUser = false;
    let temporaryPassword = '';
    
    // Check if the user already exists
    if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
      console.log(`User with email ${email} already exists`);
      
      userId = existingUsers.users[0].id;
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            name,
            role,
            assignedProperties: role === 'manager' ? assignedProperties : [],
          }
        }
      );
      
      if (updateError) {
        console.error("Error updating existing user:", updateError);
        throw updateError;
      }
      
    } else {
      isNewUser = true;
      // Generate a secure random password
      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };
      
      temporaryPassword = generatePassword();
      
      // Create the user with a temporary password
      const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          name,
          role,
          assignedProperties: role === 'manager' ? assignedProperties : [],
        }
      });
      
      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }
      
      userId = authData.user.id;
    }
    
    // Send email using Resend
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'http://localhost:3000';
    const loginUrl = `${applicationUrl}/login`;
    
    const emailHtml = isNewUser
      ? `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Welcome to Property Manager!</h2>
              <p>Hello ${name},</p>
              <p>You have been invited to join Property Manager with the role of <strong>${role}</strong>.</p>
              <p>To get started, please use the following credentials to log in:</p>
              <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              </div>
              <p>For security reasons, we recommend changing your password after your first login.</p>
              <p>
                <a href="${loginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Go to Login Page
                </a>
              </p>
              <p>If you have any questions, please contact your administrator.</p>
              <p>Thank you,<br>Property Manager Team</p>
            </div>
          </body>
        </html>
      `
      : `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Your Property Manager Account Has Been Updated</h2>
              <p>Hello ${name},</p>
              <p>Your account has been updated in the Property Manager system. You now have the role of <strong>${role}</strong>.</p>
              ${role === 'manager' ? `<p>You have been assigned to manage specific properties in the system.</p>` : ''}
              <p>
                <a href="${loginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Go to Login Page
                </a>
              </p>
              <p>If you have any questions, please contact your administrator.</p>
              <p>Thank you,<br>Property Manager Team</p>
            </div>
          </body>
        </html>
      `;
    
    console.log("Attempting to send email...");
    
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Property Manager <onboarding@resend.dev>',
        to: [email],
        subject: isNewUser ? 'Welcome to Property Manager' : 'Your Property Manager Account Has Been Updated',
        html: emailHtml,
      });
      
      if (emailError) {
        console.error("Error sending email:", emailError);
        throw emailError;
      }
      
      console.log(`Email sent successfully to ${email}, EmailID: ${emailData?.id}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: isNewUser ? "Invitation sent successfully" : "User updated and notified successfully", 
          userId,
          emailSent: true,
          emailId: emailData?.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error("Error in Resend email sending:", emailError);
      // Continue with the process even if email sending fails
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: isNewUser ? "User created but email failed" : "User updated but email failed", 
          userId,
          emailSent: false,
          emailError: emailError.message
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Invitation error (FULL ERROR):", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
