
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
      console.error("Supabase credentials are not properly configured");
      return new Response(
        JSON.stringify({ error: "Supabase credentials are not properly configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        JSON.stringify({ error: "Invalid request body", details: parseError.message }),
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
    
    let envConfig;
    try {
      envConfig = validateEnvironment();
      console.log("Environment validation passed");
    } catch (envError) {
      console.error("Environment validation failed:", envError.message);
      return new Response(
        JSON.stringify({ error: envError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { resendApiKey, applicationUrl, ownerEmail } = envConfig;
    
    // Check for existing user
    console.log(`Checking if user with email ${body.email} already exists`);
    let existingUserResult;
    try {
      existingUserResult = await findExistingUser(supabaseClient, body.email);
    } catch (userCheckError) {
      console.error("Error checking for existing user:", userCheckError);
      return new Response(
        JSON.stringify({ error: `Error checking for existing user: ${userCheckError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (existingUserResult?.user) {
      console.log(`User with email ${body.email} exists`);
      
      // If user exists but doesn't have a profile, create one
      if (!existingUserResult.hasProfile) {
        try {
          await createProfileForExistingUser(
            supabaseClient,
            existingUserResult.user,
            body.name,
            body.role,
            body.assignedProperties
          );
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `Profile created for existing user ${body.email}. You can now log in.`,
              userId: existingUserResult.user.id
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (profileError) {
          console.error("Error creating profile for existing user:", profileError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Failed to create profile for user: ${profileError.message}`
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // If user exists and has a profile, return appropriate message
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `A user with email ${body.email} already exists. Please use a different email address.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user
    try {
      console.log("Generating temporary password and creating new user");
      const temporaryPassword = generateTemporaryPassword();
      
      let newUser;
      try {
        newUser = await createNewUser(
          supabaseClient, 
          body.email, 
          body.name, 
          body.role, 
          temporaryPassword, 
          body.assignedProperties
        );
        console.log(`New user created with ID: ${newUser.id}`);
      } catch (createError) {
        console.error("Failed to create new user:", createError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Prepare email
      const cleanAppUrl = cleanApplicationUrl(applicationUrl);
      const loginUrl = `${cleanAppUrl}/login`;
      console.log('Login URL to be used in email:', loginUrl);
      
      if (!loginUrl || loginUrl.trim() === '') {
        console.error("Invalid login URL");
        return new Response(
          JSON.stringify({ error: "Login URL is not configured correctly" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            emailError: emailError.message || "Unknown error",
            emailTip: "To send emails to addresses other than your own, verify a domain at resend.com/domains"
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (userCreationError) {
      console.error("Error in user creation workflow:", userCreationError);
      return new Response(
        JSON.stringify({ error: `Failed to process invitation: ${userCreationError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Critical invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
