
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

    // Get the current user's organization details from the Authorization header
    const authHeader = req.headers.get('Authorization');
    let currentUserOrgId = null;
    let organizationName = null;
    let inviterName = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (user) {
          // Get user profile and organization details
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select(`
              organization_id,
              name,
              organizations!inner(name)
            `)
            .eq('id', user.id)
            .single();
          
          currentUserOrgId = profile?.organization_id;
          organizationName = (profile?.organizations as any)?.name;
          inviterName = profile?.name;
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

    // Create/update profile to ensure proper organization linkage
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: authUserId,
        email: normalizedEmail,
        name: body.contactName,
        role: 'contractor',
        organization_id: currentUserOrgId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (profileError) {
      console.error("Error creating/updating profile:", profileError);
      // This is critical - if profile fails, rollback contractor
      await supabaseClient.from('contractors').delete().eq('id', contractorData.id);
      if (!existingAuthUser) {
        await supabaseClient.auth.admin.deleteUser(authUserId);
      }
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }
    
    console.log("Profile created/updated successfully for contractor");

    // Create organization membership for the contractor
    if (currentUserOrgId) {
      const { error: membershipError } = await supabaseClient
        .from('user_organizations')
        .upsert({
          user_id: authUserId,
          organization_id: currentUserOrgId,
          role: 'contractor',
          is_active: true,
          is_default: true
        });

      if (membershipError) {
        console.error("Error creating organization membership:", membershipError);
        // This is important but not critical enough to rollback everything
        console.warn("Continuing despite membership error - user can be added to organization later");
      } else {
        console.log("Organization membership created successfully for contractor");
      }
    }

    // Validate the complete setup before proceeding
    // First, validate the contractor record exists
    const { data: contractorValidation, error: contractorValidationError } = await supabaseClient
      .from('contractors')
      .select('id, user_id, email, organization_id')
      .eq('id', contractorData.id)
      .single();

    if (contractorValidationError || !contractorValidation) {
      console.error("Contractor validation failed:", contractorValidationError);
      throw new Error("Contractor created but validation failed");
    }

    // Then validate the profile record exists and matches
    const { data: profileValidation, error: profileValidationError } = await supabaseClient
      .from('profiles')
      .select('id, email, organization_id')
      .eq('id', authUserId)
      .single();

    if (profileValidationError || !profileValidation) {
      console.error("Profile validation failed:", profileValidationError);
      throw new Error("Profile created but validation failed");
    }

    // Check for organization mismatch
    if (contractorValidation.organization_id !== profileValidation.organization_id) {
      console.error("Organization mismatch detected:", {
        contractorOrg: contractorValidation.organization_id,
        profileOrg: profileValidation.organization_id
      });
      throw new Error("Organization ID mismatch between contractor and profile");
    }

    console.log("Contractor setup validation passed successfully");

    // Send invitation email
    const resendApiKey = Deno.env.get('NEW_RESEND_API_KEY');
    const applicationUrl = Deno.env.get('APPLICATION_URL') || 'https://housinghub.app';
    const ownerEmail = Deno.env.get('OWNER_EMAIL') || 'admin@example.com';
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const loginUrl = `${applicationUrl}/login`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to HousingHub</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Contractor Invitation</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello ${body.contactName},</p>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                You have been invited by <strong>${inviterName || 'an administrator'}</strong> from 
                <strong>${organizationName || 'an organization'}</strong> to join HousingHub as a contractor 
                for <strong>${body.companyName}</strong>.
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">🔑 Your Login Credentials:</h3>
                <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${normalizedEmail}</p>
                <p style="margin: 8px 0; color: #555;"><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace;">${tempPassword}</code></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Login to HousingHub
                </a>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> You will be prompted to change your password on first login for security.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                If you have any questions about this invitation, please contact ${inviterName || 'your administrator'} 
                or reply to this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Best regards,<br>
                <strong>${organizationName || 'HousingHub'} Team</strong>
              </p>
            </div>
          </div>
        `;

        // Send email directly to contractor since domain is verified
        const emailRecipient = normalizedEmail;
        const isTestMode = false;
        
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: `${organizationName || 'HousingHub'} <noreply@housinghub.app>`,
          to: [emailRecipient],
          subject: `${isTestMode ? '[TEST] ' : ''}Welcome to ${organizationName || 'HousingHub'} - Contractor Invitation`,
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
    console.error("Critical contractor invitation error:", error);
    
    // Determine appropriate error status and message
    let statusCode = 500;
    let errorMessage = "An unexpected error occurred during contractor invitation";
    
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      statusCode = 401;
      errorMessage = "Authentication required to invite contractors";
    } else if (error.message?.includes('permission') || error.message?.includes('access denied')) {
      statusCode = 403;
      errorMessage = "You don't have permission to invite contractors";
    } else if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      statusCode = 409;
      errorMessage = error.message;
    } else if (error.message?.includes('validation') || error.message?.includes('invalid') || error.message?.includes('required')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
      statusCode = 503;
      errorMessage = "Service temporarily unavailable. Please try again.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage,
        error_code: error.code || 'CONTRACTOR_INVITE_ERROR',
        details: error.details || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: statusCode 
      }
    );
  }
});
