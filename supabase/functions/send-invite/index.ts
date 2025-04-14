
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
  console.log("Invite function called");
  
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

    console.log('Environment Checks:', {
      RESEND_API_KEY: resendApiKey ? 'Present' : 'Missing',
      APPLICATION_URL: applicationUrl ? 'Present' : 'Missing',
      APPLICATION_URL_VALUE: applicationUrl
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
    
    const existingUser = await findExistingUser(supabaseClient, email);
    
    let userId = '';
    let isNewUser = false;
    let temporaryPassword = '';
    
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      userId = existingUser.id;
      await updateExistingUser(supabaseClient, userId, name, role, assignedProperties);
    } else {
      isNewUser = true;
      temporaryPassword = generateTemporaryPassword();
      try {
        const newUser = await createNewUser(supabaseClient, email, name, role, temporaryPassword, assignedProperties);
        userId = newUser.id;
        console.log(`New user created with ID: ${userId}`);
      } catch (createError) {
        console.error("Error creating new user:", createError);
        return new Response(
          JSON.stringify({ error: `Error creating user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Ensure application URL doesn't have trailing slash
    const cleanAppUrl = applicationUrl.endsWith('/') 
      ? applicationUrl.slice(0, -1) 
      : applicationUrl;
    
    console.log('Clean Application URL:', cleanAppUrl);
    const loginUrl = cleanAppUrl;
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
      isNewUser
    });
    
    console.log("Attempting to send email...");
    console.log("Email will have these URLs:");
    if (isNewUser) {
      console.log(`Setup Password URL: ${loginUrl}/setup-password?email=${encodeURIComponent(email)}`);
    } else {
      console.log(`Login URL: ${loginUrl}/login`);
    }
    
    try {
      console.log("Calling Resend API to send email");
      const { data, error } = await resend.emails.send({
        from: 'Property Manager <onboarding@resend.dev>',
        to: [email],
        subject: isNewUser ? 'Welcome to Property Manager' : 'Your Property Manager Account Has Been Updated',
        html: emailHtml,
      });
      
      if (error) {
        console.error("Error sending email via Resend:", error);
        throw error;
      }
      
      console.log(`Email sent successfully to ${email}, EmailID: ${data?.id}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: isNewUser ? "Invitation sent successfully" : "User updated and notified successfully", 
          userId,
          emailSent: true,
          emailId: data?.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error("Error in Resend email sending:", emailError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: isNewUser ? "User created but email failed" : "User updated but email failed", 
          userId,
          emailSent: false,
          emailError: JSON.stringify(emailError)
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
