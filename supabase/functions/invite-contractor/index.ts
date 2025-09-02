
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteContractorRequest {
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  address?: string;
  specialties: string[];
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting invite-contractor function execution");
    
    // Create Supabase client
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
    
    const body: InviteContractorRequest = await req.json();
    console.log("Received request body:", JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.email || !body.companyName || !body.contactName || !body.phone) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields: email, companyName, contactName, and phone are required"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    const normalizedEmail = body.email.toLowerCase().trim();
    
    // Check if contractor already exists
    const { data: existingContractor, error: checkError } = await supabaseClient
      .from('contractors')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing contractor:", checkError);
      throw checkError;
    }

    if (existingContractor) {
      console.log(`Contractor with email ${normalizedEmail} already exists`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `A contractor with email ${normalizedEmail} already exists. Please use a different email address.`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200
        }
      );
    }

    // Check if user already exists in auth system
    const { data: { users }, error: getUserError } = await supabaseClient.auth.admin.listUsers();
    
    if (getUserError) {
      console.error("Error checking existing users:", getUserError);
      throw getUserError;
    }

    const existingAuthUser = users.find(user => user.email === normalizedEmail);
    let authUserId: string;
    let tempPassword: string | null = null;

    if (existingAuthUser) {
      console.log(`Auth user with email ${normalizedEmail} already exists, using existing user`);
      authUserId = existingAuthUser.id;
      
      // Generate a new password for existing user and update it
      tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
      
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        authUserId,
        {
          password: tempPassword,
          user_metadata: {
            name: body.contactName,
            role: 'contractor'
          }
        }
      );

      if (updateError) {
        console.error("Error updating existing user:", updateError);
        throw updateError;
      }
    } else {
      // Generate temporary password for new user
      tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
      
      // Create new auth user
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: body.contactName,
          role: 'contractor'
        }
      });

      if (authError) {
        console.error("Error creating auth user:", authError);
        throw authError;
      }

      authUserId = authUser.user!.id;
      console.log("Auth user created successfully:", authUserId);
    }

    // Get the current user's organization_id from the Authorization header
    const authHeader = req.headers.get('Authorization');
    let currentUserOrgId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          currentUserOrgId = profile?.organization_id;
        }
      } catch (error) {
        console.warn("Could not get current user's organization:", error);
      }
    }

    // Create contractor profile
    const { data: contractorData, error: contractorError } = await supabaseClient
      .from('contractors')
      .insert({
        user_id: authUserId,
        company_name: body.companyName,
        contact_name: body.contactName,
        email: normalizedEmail,
        phone: body.phone,
        address: body.address || null,
        specialties: body.specialties || [],
        organization_id: currentUserOrgId
      })
      .select()
      .single();

    if (contractorError) {
      console.error("Error creating contractor profile:", contractorError);
      // If contractor creation fails and we created a new user, clean it up
      if (!existingAuthUser) {
        await supabaseClient.auth.admin.deleteUser(authUserId);
      }
      throw contractorError;
    }

    console.log("Contractor profile created successfully:", contractorData.id);

    // Send invitation email
    const resendApiKey = Deno.env.get('NEW_RESEND_API_KEY');
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'http://localhost:5173';
    const ownerEmail = Deno.env.get('OWNER_EMAIL') || 'admin@example.com';
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const loginUrl = `${applicationUrl}/login`;
        const emailHtml = `
          <h1>Welcome to Property Manager</h1>
          <p>Hello ${body.contactName},</p>
          <p>You have been invited to join Property Manager as a contractor for ${body.companyName}.</p>
          <p><strong>Your login credentials:</strong></p>
          <ul>
            <li>Email: ${normalizedEmail}</li>
            <li>Temporary Password: ${tempPassword}</li>
          </ul>
          <p>Please log in at: <a href="${loginUrl}">${loginUrl}</a></p>
          <p>You will be prompted to change your password on first login.</p>
          <p>Best regards,<br>Property Manager Team</p>
        `;

        // Send email directly to contractor since domain is verified
        const emailRecipient = normalizedEmail;
        const isTestMode = false;
        
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Property Manager <noreply@housinghub.app>',
          to: [emailRecipient],
          subject: `${isTestMode ? '[TEST] ' : ''}Welcome to Property Manager - Contractor Invitation`,
          html: isTestMode 
            ? `<p><strong>TEST MODE:</strong> This email would normally be sent to ${normalizedEmail}</p>${emailHtml}` 
            : emailHtml,
        });

        if (emailError) {
          console.error("Error sending email:", emailError);
          // Don't fail the whole process if email fails
          return new Response(
            JSON.stringify({
              success: true,
              message: "Contractor created successfully, but email sending failed",
              contractorId: contractorData.id,
              emailSent: false,
              emailError: emailError.message,
              testMode: isTestMode
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Email sent successfully to ${emailRecipient}, EmailID: ${emailData?.id}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Contractor invited successfully",
            contractorId: contractorData.id,
            emailSent: true,
            emailId: emailData?.id,
            testMode: isTestMode,
            testModeInfo: isTestMode 
              ? "In test mode: Email was sent to the owner email instead of the target email. To send emails to other addresses, verify a domain at resend.com/domains."
              : null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (emailError: any) {
        console.error("Email sending error:", emailError);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Contractor created successfully, but email sending failed",
            contractorId: contractorData.id,
            emailSent: false,
            emailError: emailError.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn("NEW_RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Contractor created successfully (email not configured)",
          contractorId: contractorData.id,
          emailSent: false,
          emailError: "NEW_RESEND_API_KEY not configured"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
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
