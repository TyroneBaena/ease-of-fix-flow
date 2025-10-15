import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface UseCodeRequest {
  code: string;
  user_id: string;
}

interface UseCodeResponse {
  success: boolean;
  organization_id: string | null;
  assigned_role: string | null;
  error: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 Use Invitation Code - START');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with SERVICE ROLE to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { code, user_id } = await req.json() as UseCodeRequest;
    console.log('🔐 Request:', { code, user_id });

    if (!code || !user_id) {
      throw new Error('Missing required parameters');
    }

    // Validate the invitation code
    console.log('🔐 Validating code...');
    const { data: invitationCode, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !invitationCode) {
      console.error('🔐 Code validation failed:', codeError);
      throw new Error('Invalid or expired invitation code');
    }

    console.log('🔐 Code validated:', {
      id: invitationCode.id,
      assigned_role: invitationCode.assigned_role,
      organization_id: invitationCode.organization_id
    });

    // Check usage limits
    if (invitationCode.current_uses >= invitationCode.max_uses) {
      throw new Error('This invitation code has reached its maximum usage limit');
    }

    // Check if user already used this code
    const { data: existingUsage } = await supabase
      .from('invitation_code_usage')
      .select('id')
      .eq('invitation_code_id', invitationCode.id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingUsage) {
      throw new Error('You have already used this invitation code');
    }

    console.log('🔐 Recording usage...');
    // Record usage
    const { error: usageError } = await supabase
      .from('invitation_code_usage')
      .insert({
        invitation_code_id: invitationCode.id,
        user_id: user_id
      });

    if (usageError) {
      console.error('🔐 Usage recording failed:', usageError);
      throw new Error('Failed to record code usage');
    }

    // Increment usage count
    const { error: updateError } = await supabase
      .from('invitation_codes')
      .update({ current_uses: invitationCode.current_uses + 1 })
      .eq('id', invitationCode.id);

    if (updateError) {
      console.error('🔐 Count update failed:', updateError);
    }

    console.log('🔐 Updating user profile with role:', invitationCode.assigned_role);
    // Update user profile with SERVICE ROLE (bypasses RLS)
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: invitationCode.organization_id,
        session_organization_id: invitationCode.organization_id,
        role: invitationCode.assigned_role,
      })
      .eq('id', user_id)
      .select('role, organization_id')
      .single();

    if (profileError) {
      console.error('🔐 Profile update failed:', profileError);
      throw new Error(`Failed to update user profile: ${profileError.message}`);
    }

    console.log('🔐 Profile updated successfully:', updatedProfile);
    
    // VERIFY the role was actually set
    if (updatedProfile.role !== invitationCode.assigned_role) {
      console.error('🔐 CRITICAL: Role mismatch after update!', {
        expected: invitationCode.assigned_role,
        actual: updatedProfile.role
      });
      throw new Error(`Role verification failed: expected ${invitationCode.assigned_role} but got ${updatedProfile.role}`);
    }
    console.log('🔐 ✅ Role verified successfully:', updatedProfile.role);

    console.log('🔐 Creating user organization membership...');
    // Create user organization membership
    const { error: membershipError } = await supabase
      .from('user_organizations')
      .upsert({
        user_id: user_id,
        organization_id: invitationCode.organization_id,
        role: invitationCode.assigned_role,
        is_active: true,
        is_default: true,
      }, {
        onConflict: 'user_id,organization_id'
      });

    if (membershipError) {
      console.error('🔐 Membership creation failed:', membershipError);
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    // If contractor role, create contractor profile
    if (invitationCode.assigned_role === 'contractor') {
      console.log('🔐 Creating contractor profile...');
      
      const { data: existingContractor } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', user_id)
        .maybeSingle();

      if (!existingContractor) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', user_id)
          .single();

        const { data: newContractor, error: contractorError } = await supabase
          .from('contractors')
          .insert({
            user_id: user_id,
            organization_id: invitationCode.organization_id,
            company_name: userProfile?.name || 'New Contractor',
            contact_name: userProfile?.name || 'Contractor',
            email: userProfile?.email || '',
            phone: '',
            specialties: []
          })
          .select('id')
          .single();

        if (contractorError) {
          console.error('🔐 CRITICAL: Contractor profile creation failed:', contractorError);
          throw new Error(`Failed to create contractor profile: ${contractorError.message}`);
        } else {
          console.log('🔐 ✅ Contractor profile created successfully:', newContractor.id);
        }
      } else {
        console.log('🔐 Contractor profile already exists:', existingContractor.id);
      }
    }

    console.log('🔐 SUCCESS - User joined organization');
    
    // Final verification before responding
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user_id)
      .single();
    
    console.log('🔐 Final verification:', finalProfile);
    
    const response: UseCodeResponse = {
      success: true,
      organization_id: invitationCode.organization_id,
      assigned_role: finalProfile?.role || invitationCode.assigned_role,
      error: null
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🔐 CRITICAL ERROR:', error);
    
    const response: UseCodeResponse = {
      success: false,
      organization_id: null,
      assigned_role: null,
      error: error.message || 'Failed to use invitation code'
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});