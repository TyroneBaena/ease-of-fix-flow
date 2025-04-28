
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./lib/cors.ts";
import { createEmailHtml } from "./lib/email-templates.ts";
import { 
  findExistingUser, 
  createNewUser, 
  generateTemporaryPassword,
  createProfileForExistingUser,
  updateExistingUser
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
        JSON.stringify({ 
          success: false, 
          message: "Internal configuration error: Supabase credentials are not properly configured" 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ 
          success: false, 
          message: "Invalid request format" 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      console.error("Invalid email format:", body.email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Please enter a valid email address" 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate request and environment
    try {
      validateRequest(body);
      console.log("Request validation passed");
    } catch (validationError) {
      console.error("Request validation failed:", validationError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: validationError.message 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let envConfig;
    try {
      envConfig = validateEnvironment();
      console.log("Environment validation passed");
    } catch (envError) {
      console.error("Environment validation failed:", envError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Server configuration error"
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { resendApiKey, applicationUrl, ownerEmail } = envConfig;
    
    // Check for existing user with retry mechanism
    console.log(`Checking if user with email ${body.email} already exists`);
    let existingUserResult = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        existingUserResult = await findExistingUser(supabaseClient, body.email);
        console.log(`Attempt ${retryCount + 1}: Existing user check result:`, existingUserResult?.exists ? "User found" : "User not found");
        
        // If we found a result or definitely confirmed no user exists, break the loop
        if (existingUserResult !== null || retryCount === maxRetries) {
          break;
        }
        
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      } catch (userCheckError) {
        console.error(`Attempt ${retryCount + 1}: Error checking for existing user:`, userCheckError);
        
        if (retryCount === maxRetries) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Error processing invitation request" 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      }
    }
    
    if (existingUserResult?.exists) {
      console.log(`User with email ${body.email} exists with ID ${existingUserResult.user.id}`);
      
      // If user exists but doesn't have a profile, create or update one
      try {
        console.log(`Creating/updating profile for existing user ${existingUserResult.user.id}`);
        
        // Update user metadata in auth.users
        await updateExistingUser(
          supabaseClient, 
          existingUserResult.user.id, 
          body.name, 
          body.role, 
          body.assignedProperties
        );
        
        // Create or update profile
        const profile = await createProfileForExistingUser(
          supabaseClient,
          existingUserResult.user,
          body.name,
          body.role,
          body.assignedProperties
        );
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `User account for ${body.email} has been updated successfully.`,
            userId: existingUserResult.user.id,
            profileId: profile?.id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (profileError) {
        console.error("Error managing profile for existing user:", profileError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Failed to complete user setup.`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new user since no existing user was found
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
        // More detailed error message
        console.error("User creation error details:", createError);
        
        // Check if the error is because the user already exists (this can happen in race conditions)
        if (createError.message && (
          createError.message.includes("already exists") || 
          createError.message.toLowerCase().includes("duplicate") ||
          createError.message.toLowerCase().includes("unique constraint")
        )) {
          console.log("User creation failed because user might already exist, trying to find the user again");
          
          // Wait a moment for potential eventual consistency
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const retryExistingUser = await findExistingUser(supabaseClient, body.email);
          console.log("Retry existing user check result:", retryExistingUser?.exists ? "User found on retry" : "User still not found on retry");
          
          if (retryExistingUser?.exists) {
            // If the user exists, create or update profile
            try {
              console.log(`Creating/updating profile for existing user on retry ${retryExistingUser.user.id}`);
              
              // Update user metadata in auth.users
              await updateExistingUser(
                supabaseClient, 
                retryExistingUser.user.id, 
                body.name, 
                body.role, 
                body.assignedProperties
              );
              
              // Create or update profile
              const profile = await createProfileForExistingUser(
                supabaseClient,
                retryExistingUser.user,
                body.name,
                body.role,
                body.assignedProperties
              );
              
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  message: `User account for ${body.email} has been updated successfully.`,
                  userId: retryExistingUser.user.id,
                  profileId: profile?.id
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } catch (profileError) {
              console.error("Error managing profile for existing user:", profileError);
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  message: `Failed to complete user setup.`
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
        
        console.error("Failed to create new user:", createError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Failed to create user: ${createError.message}` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Prepare email
      const cleanAppUrl = cleanApplicationUrl(applicationUrl);
      const loginUrl = `${cleanAppUrl}/login`;
      console.log('Login URL to be used in email:', loginUrl);
      
      if (!loginUrl || loginUrl.trim() === '') {
        console.error("Invalid login URL");
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Server configuration issue with login URL" 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ 
          success: false, 
          message: `Failed to process invitation.` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Critical invitation error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "An unexpected error occurred"
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
