
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
    const body: InviteRequest = await req.json();
    console.log("Request body received:", JSON.stringify(body, null, 2));
    
    // Validate request and environment
    validateRequest(body);
    const { resendApiKey, applicationUrl, ownerEmail } = validateEnvironment();
    
    // Check for existing user
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
    const temporaryPassword = generateTemporaryPassword();
    const newUser = await createNewUser(
      supabaseClient, 
      body.email, 
      body.name, 
      body.role, 
      temporaryPassword, 
      body.assignedProperties
    );
    
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
    
    try {
      const emailData = await sendInvitationEmail(
        resendApiKey,
        emailRecipient,
        body.email,
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
  } catch (error) {
    console.error("Invitation error (FULL ERROR):", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
