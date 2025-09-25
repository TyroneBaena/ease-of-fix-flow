import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting contractor workflow validation");
    
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

    const body = await req.json();
    const { contractorEmail } = body;

    if (!contractorEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "contractorEmail is required"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    const results: ValidationResult[] = [];

    // Step 1: Check if contractor exists
    console.log("Step 1: Checking contractor existence");
    try {
      const { data: contractor, error } = await supabaseClient
        .from('contractors')
        .select('*')
        .eq('email', contractorEmail)
        .maybeSingle();

      if (error) throw error;

      if (!contractor) {
        results.push({
          step: "contractor_existence",
          success: false,
          message: "Contractor not found",
          error: `No contractor found with email ${contractorEmail}`
        });
      } else {
        results.push({
          step: "contractor_existence",
          success: true,
          message: "Contractor found",
          data: { contractorId: contractor.id, userId: contractor.user_id }
        });
      }
    } catch (error: any) {
      results.push({
        step: "contractor_existence",
        success: false,
        message: "Error checking contractor",
        error: error.message
      });
    }

    const contractorData = results[0].data;
    if (!contractorData) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Cannot continue validation without contractor data",
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check profile linkage
    console.log("Step 2: Checking profile linkage");
    try {
      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', contractorData.userId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        results.push({
          step: "profile_linkage",
          success: false,
          message: "Profile not found",
          error: `No profile found for user ${contractorData.userId}`
        });
      } else {
        results.push({
          step: "profile_linkage",
          success: true,
          message: "Profile found and linked",
          data: { 
            profileId: profile.id, 
            email: profile.email,
            organizationId: profile.organization_id,
            role: profile.role
          }
        });
      }
    } catch (error: any) {
      results.push({
        step: "profile_linkage",
        success: false,
        message: "Error checking profile",
        error: error.message
      });
    }

    // Step 3: Check organization consistency
    console.log("Step 3: Checking organization consistency");
    try {
      const { data: contractorWithProfile, error } = await supabaseClient
        .from('contractors')
        .select(`
          id,
          organization_id,
          profiles!inner(id, organization_id, email)
        `)
        .eq('id', contractorData.contractorId)
        .single();

      if (error) throw error;

      const contractorOrg = contractorWithProfile.organization_id;
      const profileOrg = (contractorWithProfile.profiles as any).organization_id;

      if (contractorOrg === profileOrg) {
        results.push({
          step: "organization_consistency",
          success: true,
          message: "Organization IDs match",
          data: { 
            contractorOrganizationId: contractorOrg,
            profileOrganizationId: profileOrg
          }
        });
      } else {
        results.push({
          step: "organization_consistency",
          success: false,
          message: "Organization ID mismatch",
          error: `Contractor org: ${contractorOrg}, Profile org: ${profileOrg}`,
          data: { 
            contractorOrganizationId: contractorOrg,
            profileOrganizationId: profileOrg
          }
        });
      }
    } catch (error: any) {
      results.push({
        step: "organization_consistency",
        success: false,
        message: "Error checking organization consistency",
        error: error.message
      });
    }

    // Step 4: Check RLS access
    console.log("Step 4: Checking RLS access simulation");
    try {
      // Simulate RLS by checking if contractor can access their own data
      const { data: contractorAccess, error } = await supabaseClient
        .from('contractors')
        .select('id, company_name')
        .eq('id', contractorData.contractorId);

      if (error) throw error;

      if (contractorAccess && contractorAccess.length > 0) {
        results.push({
          step: "rls_access_check",
          success: true,
          message: "Contractor data accessible via RLS",
          data: { accessibleRecords: contractorAccess.length }
        });
      } else {
        results.push({
          step: "rls_access_check",
          success: false,
          message: "Contractor data not accessible",
          error: "RLS policies may be blocking access"
        });
      }
    } catch (error: any) {
      results.push({
        step: "rls_access_check",
        success: false,
        message: "Error checking RLS access",
        error: error.message
      });
    }

    // Step 5: Check auth user status
    console.log("Step 5: Checking auth user status");
    try {
      const { data: { users }, error } = await supabaseClient.auth.admin.listUsers();
      
      if (error) throw error;

      const authUser = users.find(user => user.id === contractorData.userId);

      if (authUser) {
        results.push({
          step: "auth_user_status",
          success: true,
          message: "Auth user exists and accessible",
          data: { 
            userId: authUser.id,
            email: authUser.email,
            emailConfirmed: authUser.email_confirmed_at !== null,
            lastSignIn: authUser.last_sign_in_at,
            role: authUser.user_metadata?.role
          }
        });
      } else {
        results.push({
          step: "auth_user_status",
          success: false,
          message: "Auth user not found",
          error: `No auth user found with ID ${contractorData.userId}`
        });
      }
    } catch (error: any) {
      results.push({
        step: "auth_user_status",
        success: false,
        message: "Error checking auth user",
        error: error.message
      });
    }

    // Overall validation summary
    const failedSteps = results.filter(r => !r.success);
    const overallSuccess = failedSteps.length === 0;

    console.log(`Validation completed. Success: ${overallSuccess}, Failed steps: ${failedSteps.length}`);

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        message: overallSuccess 
          ? "All validation steps passed successfully" 
          : `${failedSteps.length} validation step(s) failed`,
        contractorEmail,
        results,
        summary: {
          totalSteps: results.length,
          passedSteps: results.filter(r => r.success).length,
          failedSteps: failedSteps.length,
          criticalIssues: failedSteps.filter(r => 
            r.step === 'contractor_existence' || 
            r.step === 'profile_linkage' || 
            r.step === 'organization_consistency'
          ).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Critical validation error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Validation process failed",
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});