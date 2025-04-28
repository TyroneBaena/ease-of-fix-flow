
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./lib/cors.ts";
import { createEmailHtml } from "./lib/email-templates.ts";
import { validateRequest, validateEnvironment } from "./lib/validation-service.ts";
import { findExistingUser, createNewUser, generateTemporaryPassword } from "./lib/user-service.ts";
import { sendInvitationEmail } from "./lib/email-service.ts";
import { cleanApplicationUrl } from "./lib/validation.ts";
import type { InviteRequest } from "./lib/types.ts";

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-invite function execution");
    
    // Create Supabase client and validate environment
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    const body: InviteRequest = await req.json();
    validateRequest(body);
    const envConfig = validateEnvironment();
    
    const { resendApiKey, applicationUrl, ownerEmail } = envConfig;
    const normalizedEmail = body.email.toLowerCase().trim();
    
    // Check for existing user
    console.log(`Checking if user with email ${normalizedEmail} already exists`);
    const existingUserResult = await findExistingUser(supabaseClient, normalizedEmail);
    
    // Handle existing non-placeholder user
    if (existingUserResult?.exists && !existingUserResult.isPlaceholder) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `A user with email ${normalizedEmail} already exists. Please use a different email address.`,
          userId: existingUserResult.user.id,
          email: normalizedEmail
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user
    const temporaryPassword = generateTemporaryPassword();
    const newUser = await createNewUser(
      supabaseClient,
      normalizedEmail,
      body.name,
      body.role,
      temporaryPassword,
      body.assignedProperties
    );

    // Send email
    const cleanAppUrl = cleanApplicationUrl(applicationUrl);
    const loginUrl = `${cleanAppUrl}/login`;
    const emailHtml = createEmailHtml({
      to: normalizedEmail,
      name: body.name,
      role: body.role,
      temporaryPassword,
      loginUrl,
      isNewUser: true
    });

    const emailRecipient = normalizedEmail === ownerEmail ? normalizedEmail : ownerEmail;
    const isTestMode = normalizedEmail !== ownerEmail;
    
    const emailData = await sendInvitationEmail(
      resendApiKey,
      emailRecipient,
      normalizedEmail,
      emailHtml,
      isTestMode
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        userId: newUser.id,
        emailSent: true,
        emailId: emailData?.id,
        isNewUser: true,
        email: normalizedEmail,
        testMode: isTestMode,
        testModeInfo: isTestMode 
          ? "In test mode: Email was sent to the owner email instead of the target email. To send emails to other addresses, verify a domain at resend.com/domains."
          : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Critical invitation error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "An unexpected error occurred"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
