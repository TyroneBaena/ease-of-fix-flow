
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

// Update the Resend import to use a version compatible with Deno
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const body = await req.json();
    const { email, name, role, assignedProperties = [] } = body;
    
    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Email, name, and role are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing invitation for ${email} with role ${role}`);
    
    // Check for required environment variables
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
    
    // Initialize Resend with API key - using updated library
    const resend = new Resend(resendApiKey);
    console.log("Resend initialized with API key");
    
    // Check if the user already exists
    const existingUser = await findExistingUser(supabaseClient, email);
    
    let userId = '';
    let isNewUser = false;
    let temporaryPassword = '';
    
    // Process user creation or update
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      userId = existingUser.id;
      await updateExistingUser(supabaseClient, userId, name, role, assignedProperties);
    } else {
      isNewUser = true;
      temporaryPassword = generateTemporaryPassword();
      const newUser = await createNewUser(supabaseClient, email, name, role, temporaryPassword, assignedProperties);
      userId = newUser.id;
    }
    
    // Send email using Resend
    const loginUrl = `${applicationUrl}/login`;
    
    const emailHtml = createEmailHtml({
      to: email,
      name,
      role,
      temporaryPassword,
      loginUrl,
      isNewUser
    });
    
    console.log("Attempting to send email...");
    
    try {
      // Updated Resend API call to match v2.0.0 syntax
      const { data, error } = await resend.emails.send({
        from: 'Property Manager <onboarding@resend.dev>',
        to: [email],
        subject: isNewUser ? 'Welcome to Property Manager' : 'Your Property Manager Account Has Been Updated',
        html: emailHtml,
      });
      
      if (error) {
        console.error("Error sending email:", error);
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
