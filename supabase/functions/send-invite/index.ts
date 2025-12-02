
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./lib/cors.ts";
import { createEmailHtml } from "./lib/email-templates.ts";
import { validateRequest, validateEnvironment } from "./lib/validation-service.ts";
import { findExistingUser, createNewUser, generateTemporaryPassword } from "./lib/user-service.ts";
import { sendInvitationEmail } from "./lib/email-sender.ts";
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
    
    // Handle both direct HTTP requests and Supabase function invocations
    let body: InviteRequest;
    
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Content-Type:", req.headers.get('content-type'));
    console.log("Authorization header present:", !!req.headers.get('authorization'));
    
    try {
      // Try to read the body as JSON first (most common case)
      body = await req.json();
      console.log("Successfully parsed request body:", JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error("Failed to parse request body as JSON:", jsonError);
      
      // If JSON parsing fails, let's see what we actually received
      try {
        const rawBody = await req.text();
        console.log("Raw body content (length: " + rawBody.length + "):", rawBody);
        
        if (!rawBody || rawBody.trim() === '') {
          console.error("Empty request body received");
          return new Response(
            JSON.stringify({
              success: false,
              message: "Empty request body received",
              error_code: 'EMPTY_BODY'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
              status: 400 
            }
          );
        }
        
        // Try to parse the raw body as JSON
        try {
          body = JSON.parse(rawBody);
          console.log("Successfully parsed raw body as JSON:", JSON.stringify(body, null, 2));
        } catch (secondParseError) {
          console.error("Failed to parse raw body as JSON:", secondParseError);
          return new Response(
            JSON.stringify({
              success: false,
              message: `Invalid JSON format: ${(secondParseError as Error).message}`,
              error_code: 'INVALID_JSON',
              receivedContent: rawBody.substring(0, 200) // First 200 chars for debugging
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
              status: 400 
            }
          );
        }
      } catch (textError) {
        console.error("Failed to read request as text:", textError);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to read request body: ${(textError as Error).message}`,
            error_code: 'BODY_READ_ERROR'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        );
      }
    }
    
    console.log("Request body received:", JSON.stringify(body, null, 2));
    
    validateRequest(body);
    const envConfig = validateEnvironment();
    
    console.log("Environment validation completed. API Key status:", {
      hasApiKey: !!envConfig.resendApiKey,
      keyLength: envConfig.resendApiKey?.length,
      keyPrefix: envConfig.resendApiKey?.substring(0, 12) + "...",
      ownerEmail: envConfig.ownerEmail,
      applicationUrl: envConfig.applicationUrl
    });
    
    const { resendApiKey, applicationUrl, ownerEmail } = envConfig;
    const normalizedEmail = body.email.toLowerCase().trim();
    
    // Get inviting user info (organization and name)
    let invitingUserOrgId: string | null = null;
    let invitingUserId: string | null = null;
    let organizationName: string | null = null;
    let inviterName: string | null = null;
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);
        if (!error && user) {
          invitingUserId = user.id;
          console.log(`Inviting user ID: ${invitingUserId}`);
          
          // Get inviting user's profile (name) and organization
          const { data: invitingUserProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('organization_id, name')
            .eq('id', user.id)
            .single();
          
          if (!profileError && invitingUserProfile) {
            invitingUserOrgId = invitingUserProfile.organization_id;
            inviterName = invitingUserProfile.name;
            console.log(`Inviting user: ${inviterName}, organization: ${invitingUserOrgId}`);
            
            // Get organization name
            if (invitingUserOrgId) {
              const { data: orgData, error: orgError } = await supabaseClient
                .from('organizations')
                .select('name')
                .eq('id', invitingUserOrgId)
                .single();
              
              if (!orgError && orgData) {
                organizationName = orgData.name;
                console.log(`Organization name: ${organizationName}`);
              }
            }
          }
        }
      } catch (error) {
        console.log("Could not get inviting user info from token:", error);
      }
    }
    
    // Don't allow current user to invite themselves
    if (body.bypassExistingCheck !== true) {
      // Check for existing user
      console.log(`Checking if user with email ${normalizedEmail} already exists`);
      const existingUserResult = await findExistingUser(supabaseClient, normalizedEmail);
      
      console.log(`Existing user check result:`, JSON.stringify(existingUserResult, null, 2));
      
      // Handle existing non-placeholder user - BUT CHECK ORGANIZATION MEMBERSHIP FIRST!
      if (existingUserResult?.exists && !existingUserResult.isPlaceholder) {
        if (invitingUserOrgId) {
          // Check if existing user is already a member of THIS organization
          const { data: membership, error: membershipError } = await supabaseClient
            .from('user_organizations')
            .select('*')
            .eq('user_id', existingUserResult.user.id)
            .eq('organization_id', invitingUserOrgId)
            .eq('is_active', true);
          
          if (!membershipError && membership && membership.length > 0) {
            console.log(`User ${normalizedEmail} is already a member of organization ${invitingUserOrgId}`);
            return new Response(
              JSON.stringify({
                success: false,
                message: `User ${normalizedEmail} is already a member of your organization.`,
                userId: existingUserResult.user?.id,
                email: normalizedEmail
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 200
              }
            );
          } else {
            // User exists but NOT in this organization - ADD THEM TO THIS ORGANIZATION!
            console.log(`Adding existing user ${normalizedEmail} to organization ${invitingUserOrgId}`);
            
            // Create user organization membership
            const { error: membershipInsertError } = await supabaseClient
              .from('user_organizations')
              .insert({
                user_id: existingUserResult.user.id,
                organization_id: invitingUserOrgId,
                role: body.role,
                is_active: true,
                is_default: false // Don't change their default organization
              });
            
            if (membershipInsertError) {
              console.error("Error adding user to organization:", membershipInsertError);
              return new Response(
                JSON.stringify({
                  success: false,
                  message: `Failed to add existing user to organization: ${membershipInsertError.message}`,
                  email: normalizedEmail
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                  status: 200
                }
              );
            }
            
            console.log(`Successfully added existing user ${normalizedEmail} to organization ${invitingUserOrgId}`);
            
            // Send them an email about being added to the new organization
            const cleanAppUrl = cleanApplicationUrl(applicationUrl);
            const loginUrl = `${cleanAppUrl}/login`;
            const emailHtml = createEmailHtml({
              to: normalizedEmail,
              name: existingUserResult.profile?.name || body.name,
              role: body.role,
              temporaryPassword: undefined,
              loginUrl,
              isNewUser: false,
              organizationName: organizationName || undefined,
              inviterName: inviterName || undefined
            });

            // Send notification email
            const emailData = await sendInvitationEmail(
              resendApiKey,
              normalizedEmail,
              normalizedEmail,
              emailHtml,
              false,
              organizationName || undefined,
              false
            );

            return new Response(
              JSON.stringify({
                success: true,
                message: `Existing user ${normalizedEmail} has been successfully added to your organization`,
                userId: existingUserResult.user.id,
                emailSent: true,
                emailId: emailData?.id,
                isNewUser: false,
                email: normalizedEmail,
                isExistingUserAddedToOrg: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // Fallback - user exists but we couldn't check organization membership
        console.log(`User with email ${normalizedEmail} already exists, sending error response`);
        return new Response(
          JSON.stringify({
            success: false,
            message: `A user with email ${normalizedEmail} already exists. Please use a different email address.`,
            userId: existingUserResult.user?.id,
            email: normalizedEmail
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200 // Keep as 200 with success: false for consistent client processing
          }
        );
      }

      // Check for existing profile with this email
      const { data: existingProfiles, error: profilesError, count } = await supabaseClient
        .from('profiles')
        .select('*', { count: 'exact' })
        .ilike('email', normalizedEmail);
        
      if (profilesError) {
        console.error("Error checking profiles table:", profilesError);
      } else if (count && count > 0) {
        console.log(`Found existing profile with email ${normalizedEmail}`);
        return new Response(
          JSON.stringify({
            success: false,
            message: `A user with email ${normalizedEmail} already exists. Please use a different email address.`,
            email: normalizedEmail
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 200
          }
        );
      }
    } else {
      console.log("Bypassing existing user check as requested");
    }

    // Create new user
    const temporaryPassword = generateTemporaryPassword();
    const newUser = await createNewUser(
      supabaseClient,
      normalizedEmail,
      body.name,
      body.role,
      temporaryPassword,
      body.assignedProperties,
      invitingUserId || undefined
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
      isNewUser: true,
      organizationName: organizationName || undefined,
      inviterName: inviterName || undefined
    });

    // Send email directly to the invited user (Pro account - no test mode restrictions)
    const emailRecipient = normalizedEmail;
    const isTestMode = false;
    
    const emailData = await sendInvitationEmail(
      resendApiKey,
      emailRecipient,
      normalizedEmail,
      emailHtml,
      isTestMode,
      organizationName || undefined,
      true
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
  } catch (error: any) {
    console.error("Critical invitation error:", error);
    
    // Determine appropriate error status and message
    let statusCode = 500;
    let errorMessage = "An unexpected error occurred";
    
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      statusCode = 401;
      errorMessage = "Authentication required";
    } else if (error.message?.includes('permission') || error.message?.includes('access denied')) {
      statusCode = 403;
      errorMessage = "Access denied";
    } else if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      statusCode = 409;
      errorMessage = error.message;
    } else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage,
        error_code: error.code || 'UNKNOWN_ERROR'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: statusCode 
      }
    );
  }
});
