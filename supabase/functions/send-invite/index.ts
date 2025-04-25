
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./lib/cors.ts";
import { createEmailHtml } from "./lib/email-templates.ts";
import { 
  findExistingUser, 
  updateExistingUser, 
  createNewUser, 
  generateTemporaryPassword
} from "./lib/user-management.ts";

import { Resend } from "https://esm.sh/resend@2.0.0";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const body = await req.json();
    console.log("Request body received:", JSON.stringify(body, null, 2));
    const { email, name, role, assignedProperties = [] } = body;
    
    if (!email || !name || !role) {
      console.error("Missing required fields:", { email, name, role });
      return new Response(
        JSON.stringify({ error: "Email, name, and role are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing invitation for ${email} with role ${role}`);
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const applicationUrl = Deno.env.get('APPLICATION_URL');
    const ownerEmail = Deno.env.get('RESEND_OWNER_EMAIL') || 'tyronebaena@gmail.com';

    console.log('Environment Checks:', {
      RESEND_API_KEY: resendApiKey ? 'Present' : 'Missing',
      APPLICATION_URL: applicationUrl ? 'Present' : 'Missing',
      APPLICATION_URL_VALUE: applicationUrl,
      RESEND_OWNER_EMAIL: ownerEmail
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
    
    const resend = new Resend(resendApiKey);
    console.log("Resend initialized with API key");
    
    // Check if user already exists but DON'T update them - we want to prevent duplicate accounts
    const existingUser = await findExistingUser(supabaseClient, email);
    
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `A user with email ${email} already exists. Please use a different email address.`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Always create a new user since we've confirmed one doesn't exist
    const temporaryPassword = generateTemporaryPassword();
    let userId = '';
    let newUser = null;
    
    try {
      newUser = await createNewUser(supabaseClient, email, name, role, temporaryPassword, assignedProperties);
      userId = newUser.id;
      console.log(`New user created with ID: ${userId}`);
    } catch (createError) {
      console.error("Error creating new user:", createError);
      return new Response(
        JSON.stringify({ error: `Error creating user: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Ensure application URL doesn't have trailing slash and doesn't include /login path
    let cleanAppUrl = applicationUrl;
    if (cleanAppUrl.endsWith('/')) {
      cleanAppUrl = cleanAppUrl.slice(0, -1);
    }
    
    // Remove /login if it's at the end of the URL
    if (cleanAppUrl.endsWith('/login')) {
      cleanAppUrl = cleanAppUrl.slice(0, -6);
    }
    
    console.log('Clean Application URL:', cleanAppUrl);
    const loginUrl = `${cleanAppUrl}/login`;
    console.log('Login URL to be used in email:', loginUrl);
    
    if (!loginUrl || loginUrl.trim() === '') {
      return new Response(
        JSON.stringify({ error: "Login URL is not configured correctly" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const emailHtml = createEmailHtml({
      to: email,
      name,
      role,
      temporaryPassword,
      loginUrl,
      isNewUser: true
    });
    
    // Check if we're in test mode (only can send to owner email)
    const emailRecipient = email === ownerEmail ? email : ownerEmail;
    const isTestMode = email !== ownerEmail;
    
    console.log("Attempting to send email...");
    console.log(`Email will be sent to ${emailRecipient} (${isTestMode ? 'TEST MODE - redirected' : 'direct send'})`);
    
    if (isTestMode) {
      console.log(`NOTE: In test mode, email is redirected to ${ownerEmail} instead of ${email}`);
      console.log("To send to other recipients, please verify a domain at resend.com/domains");
    }
    
    try {
      console.log("Calling Resend API to send email");
      const { data, error } = await resend.emails.send({
        from: 'Property Manager <onboarding@resend.dev>',
        to: [emailRecipient],
        subject: `${isTestMode ? '[TEST] ' : ''}Welcome to Property Manager`,
        html: isTestMode 
          ? `<p><strong>TEST MODE:</strong> This email would normally be sent to ${email}</p>${emailHtml}` 
          : emailHtml,
      });
      
      if (error) {
        console.error("Error sending email via Resend:", error);
        throw error;
      }
      
      console.log(`Email sent successfully to ${emailRecipient}, EmailID: ${data?.id}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "User created successfully",
          userId,
          emailSent: true,
          emailId: data?.id,
          testMode: isTestMode,
          // Include helpful information about test mode
          testModeInfo: isTestMode 
            ? "In test mode: Email was sent to the owner email instead of the target email. To send emails to other addresses, verify a domain at resend.com/domains." 
            : null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error("Error in Resend email sending:", emailError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "User created but email failed", 
          userId,
          emailSent: false,
          emailError: JSON.stringify(emailError),
          emailTip: "To send emails to addresses other than your own, verify a domain at resend.com/domains"
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
