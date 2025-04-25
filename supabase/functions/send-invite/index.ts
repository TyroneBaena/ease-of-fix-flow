
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./lib/cors.ts";
import { createEmailHtml } from "./lib/email-templates.ts";
import { 
  findExistingUser, 
  createNewUser, 
  generateTemporaryPassword 
} from "./lib/user-management.ts";
import { sendInvitationEmail } from "./lib/email-sender.ts";
import { validateRequest, validateEnvironment, cleanApplicationUrl } from "./lib/validation.ts";
import type { InviteRequest } from "./lib/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-invite function execution");
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Log environment variables availability (without revealing values)
    console.log("Environment check:", {
      SUPABASE_URL: supabaseUrl ? 'Present' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'Present' : 'Missing'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials are not properly configured");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Parse and validate request body
    let body: InviteRequest;
    try {
      body = await req.json();
      console.log("Request body received:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate request and environment
    try {
      validateRequest(body);
      console.log("Request validation passed");
    } catch (validationError) {
      console.error("Request validation failed:", validationError.message);
      return new Response(
        JSON.stringify({ error: validationError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { resendApiKey, applicationUrl, ownerEmail } = validateEnvironment();
    
    // Check for existing user
    console.log(`Checking if user with email ${body.email} already exists`);
    const existingUser = await findExistingUser(supabaseClient, body.email);
    if (existingUser) {
      console.log(`User with email ${body.email} already exists`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `A user with email ${body.email} already exists. Please use a different email address.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user
    try {
      console.log("Generating temporary password and creating new user");
      const temporaryPassword = generateTemporaryPassword();
      const newUser = await createNewUser(
        supabaseClient, 
        body.email, 
        body.name, 
        body.role, 
        temporaryPassword, 
        body.assignedProperties
      );
      
      console.log(`New user created with ID: ${newUser.id}`);
      
      // Prepare email
      const cleanAppUrl = cleanApplicationUrl(applicationUrl);
      const loginUrl = `${cleanAppUrl}/login`;
      console.log('Login URL to be used in email:', loginUrl);
      
      if (!loginUrl || loginUrl.trim() === '') {
        return new Response(
          JSON.stringify({ error: "Login URL is not configured correctly" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const emailHtml = createEmailHtml({
        to: body.email,
        name: body.name,
        role: body.role,
        temporaryPassword,
        loginUrl,
        isNewUser: true
      });
      
      // Determine email recipient based on test mode
      const emailRecipient = body.email === ownerEmail ? body.email : ownerEmail;
      const isTestMode = body.email !== ownerEmail;
      
      console.log(`Sending email in ${isTestMode ? 'test mode' : 'production mode'}`);
      console.log(`Email will be sent to ${emailRecipient}`);
      
      // Send email
      try {
        const emailData = await sendInvitationEmail(
          resendApiKey,
          emailRecipient,
          body.email,
          emailHtml,
          isTestMode
        );
        
        console.log("Email sent successfully:", emailData);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "User created successfully",
            userId: newUser.id,
            emailSent: true,
            emailId: emailData?.id,
            testMode: isTestMode,
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
            userId: newUser.id,
            emailSent: false,
            emailError: JSON.stringify(emailError),
            emailTip: "To send emails to addresses other than your own, verify a domain at resend.com/domains"
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (userCreationError) {
      console.error("Error creating new user:", userCreationError);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${userCreationError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Invitation error (FULL ERROR):", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: error.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
