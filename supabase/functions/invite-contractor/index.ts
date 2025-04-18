
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteContractorRequest {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  address: string | null;
  specialties: string[];
}

serve(async (req: Request) => {
  console.log("Invite contractor function called");
  
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
    const { email, companyName, contactName, phone, address, specialties } = body as InviteContractorRequest;
    
    if (!email || !companyName || !contactName || !phone) {
      console.error("Missing required fields:", { email, companyName, contactName, phone });
      return new Response(
        JSON.stringify({ error: "Required fields are missing" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing contractor invitation for ${email}`);
    
    // Check if the contractor already exists by email
    const { data: existingContractors, error: searchError } = await supabaseClient
      .from('contractors')
      .select('*')
      .eq('email', email);
      
    if (searchError) {
      throw searchError;
    }
    
    if (existingContractors && existingContractors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `A contractor with the email ${email} already exists` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate a temporary password
    const temporaryPassword = generateTemporaryPassword();
    
    // Create a new auth user with the contractor role
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        name: contactName,
        role: 'contractor',
        companyName,
      }
    });
    
    if (createError) {
      throw createError;
    }
    
    const userId = authData.user.id;
    
    // Create a new contractor record
    const { data: contractorData, error: contractorError } = await supabaseClient
      .from('contractors')
      .insert([
        {
          user_id: userId,
          company_name: companyName,
          contact_name: contactName,
          email,
          phone,
          address,
          specialties,
        }
      ])
      .select();
      
    if (contractorError) {
      throw contractorError;
    }
    
    // Send welcome email with temporary password
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const applicationUrl = Deno.env.get('APPLICATION_URL');
    const ownerEmail = Deno.env.get('RESEND_OWNER_EMAIL') || 'tyronebaena@gmail.com';

    console.log('Environment Checks:', {
      RESEND_API_KEY: resendApiKey ? 'Present' : 'Missing',
      APPLICATION_URL: applicationUrl ? 'Present' : 'Missing',
      APPLICATION_URL_VALUE: applicationUrl,
      RESEND_OWNER_EMAIL: ownerEmail
    });
    
    // Ensure application URL doesn't have trailing slash
    let cleanAppUrl = applicationUrl;
    if (cleanAppUrl && cleanAppUrl.endsWith('/')) {
      cleanAppUrl = cleanAppUrl.slice(0, -1);
    }
    
    const loginUrl = cleanAppUrl ? `${cleanAppUrl}/login` : null;
    
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not set - skipping email notification");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Contractor created but email notification skipped (no API key)",
          contractorId: contractorData[0].id,
          userId,
          emailSent: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!loginUrl) {
      console.warn("APPLICATION_URL is not set - skipping email notification");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Contractor created but email notification skipped (no application URL)",
          contractorId: contractorData[0].id,
          userId,
          emailSent: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const resend = new Resend(resendApiKey);
    
    // Check if we're in test mode (can only send to owner email)
    const emailRecipient = email === ownerEmail ? email : ownerEmail;
    const isTestMode = email !== ownerEmail;
    
    if (isTestMode) {
      console.log(`NOTE: In test mode, email is redirected to ${ownerEmail} instead of ${email}`);
    }
    
    // Create email content
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to Property Manager</h1>
        <p>Hello ${contactName},</p>
        <p>You have been invited to join as a contractor for ${companyName}.</p>
        <p>Here are your temporary credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p>Please login using these credentials and change your password immediately.</p>
        <a href="${loginUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; margin-top: 15px;">Login Now</a>
        <p style="margin-top: 20px;">If you have any questions, please contact the administrator.</p>
      </div>
    `;
    
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Property Manager <onboarding@resend.dev>',
        to: [emailRecipient],
        subject: isTestMode 
          ? '[TEST] Welcome to Property Manager - Contractor Invitation' 
          : 'Welcome to Property Manager - Contractor Invitation',
        html: isTestMode 
          ? `<p><strong>TEST MODE:</strong> This email would normally be sent to ${email}</p>${emailHtml}` 
          : emailHtml,
      });
      
      if (emailError) {
        console.error("Error sending email:", emailError);
        throw emailError;
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Contractor invited successfully", 
          contractorId: contractorData[0].id,
          userId,
          emailSent: true,
          emailId: emailData?.id,
          testMode: isTestMode
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      
      // Return success since the contractor was created, but note email failed
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Contractor created but invitation email failed",
          contractorId: contractorData[0].id,
          userId,
          emailSent: false,
          emailError: JSON.stringify(emailError)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Invitation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: error.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to generate a temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
