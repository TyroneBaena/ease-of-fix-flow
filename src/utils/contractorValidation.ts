import { supabase } from '@/integrations/supabase/client';

/**
 * Comprehensive contractor profile validation and auto-repair utilities
 * Prevents notification failures and ensures data consistency
 */

export interface ContractorValidationResult {
  isValid: boolean;
  contractor: {
    id: string;
    user_id: string;
    company_name: string;
    organization_id: string;
  } | null;
  profile: {
    id: string;
    organization_id: string;
    role: string;
    name: string;
  } | null;
  issues: string[];
  wasRepaired: boolean;
}

/**
 * Validates contractor profile completeness and creates missing profile if needed
 */
export const validateAndRepairContractorProfile = async (contractorId: string): Promise<ContractorValidationResult> => {
  const result: ContractorValidationResult = {
    isValid: false,
    contractor: null,
    profile: null,
    issues: [],
    wasRepaired: false
  };

  try {
    // Fetch contractor details
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id, user_id, company_name, organization_id, email')
      .eq('id', contractorId)
      .single();

    if (contractorError || !contractor) {
      result.issues.push(`Contractor not found: ${contractorError?.message || 'Unknown error'}`);
      return result;
    }

    result.contractor = contractor;

    if (!contractor.user_id) {
      result.issues.push('Contractor missing user_id');
      return result;
    }

    if (!contractor.organization_id) {
      result.issues.push('Contractor missing organization_id');
      return result;
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role, name, email')
      .eq('id', contractor.user_id)
      .maybeSingle();

    if (profileError) {
      result.issues.push(`Error checking profile: ${profileError.message}`);
      return result;
    }

    if (!profile) {
      // Auto-repair: Create missing profile
      console.log(`Creating missing profile for contractor ${contractor.company_name}`);
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: contractor.user_id,
          email: contractor.email || `${contractor.company_name.toLowerCase().replace(/\s+/g, '')}@contractor.com`,
          name: `${contractor.company_name} Contractor`,
          role: 'contractor',
          organization_id: contractor.organization_id
        })
        .select()
        .single();

      if (createError) {
        result.issues.push(`Failed to create profile: ${createError.message}`);
        return result;
      }

      result.profile = newProfile;
      result.wasRepaired = true;
      console.log(`Successfully created profile for contractor ${contractor.company_name}`);
    } else {
      result.profile = profile;

      // Validate profile consistency
      if (profile.organization_id !== contractor.organization_id) {
        result.issues.push('Profile organization mismatch with contractor organization');
        
        // Auto-repair: Update profile organization
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ organization_id: contractor.organization_id })
          .eq('id', contractor.user_id);

        if (!updateError) {
          result.profile.organization_id = contractor.organization_id;
          result.wasRepaired = true;
          console.log(`Updated profile organization for contractor ${contractor.company_name}`);
        } else {
          result.issues.push(`Failed to update profile organization: ${updateError.message}`);
        }
      }

      if (profile.role !== 'contractor') {
        result.issues.push('Profile role is not contractor');
        
        // Auto-repair: Update profile role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'contractor' })
          .eq('id', contractor.user_id);

        if (!updateError) {
          result.profile.role = 'contractor';
          result.wasRepaired = true;
          console.log(`Updated profile role for contractor ${contractor.company_name}`);
        } else {
          result.issues.push(`Failed to update profile role: ${updateError.message}`);
        }
      }
    }

    // Final validation
    result.isValid = result.issues.length === 0 && result.profile !== null;
    
    if (result.wasRepaired) {
      console.log(`Contractor profile validation completed with repairs for ${contractor.company_name}`);
    }

    return result;
  } catch (error) {
    console.error('Contractor validation failed:', error);
    result.issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Validates organization consistency between request and contractor
 */
export const validateOrganizationConsistency = async (
  requestId: string, 
  contractorId: string
): Promise<{ isValid: boolean; requestOrg?: string; contractorOrg?: string; error?: string }> => {
  try {
    // Get request organization
    const { data: request, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('organization_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return { isValid: false, error: `Request not found: ${requestError?.message}` };
    }

    // Get contractor organization
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('organization_id')
      .eq('id', contractorId)
      .single();

    if (contractorError || !contractor) {
      return { isValid: false, error: `Contractor not found: ${contractorError?.message}` };
    }

    const isValid = request.organization_id === contractor.organization_id;
    
    return {
      isValid,
      requestOrg: request.organization_id,
      contractorOrg: contractor.organization_id,
      error: isValid ? undefined : 'Organization mismatch between request and contractor'
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Organization validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Batch validate all contractors in an organization to prevent future issues
 */
export const validateAllContractorsInOrganization = async (organizationId: string) => {
  console.log(`Starting batch validation for organization: ${organizationId}`);
  
  const { data: contractors, error } = await supabase
    .from('contractors')
    .select('id, company_name')
    .eq('organization_id', organizationId);

  if (error || !contractors) {
    console.error('Failed to fetch contractors for validation:', error);
    return;
  }

  const results: { contractor: string; issues: string[]; wasRepaired: boolean }[] = [];

  for (const contractor of contractors) {
    const validation = await validateAndRepairContractorProfile(contractor.id);
    
    if (!validation.isValid || validation.wasRepaired) {
      results.push({
        contractor: contractor.company_name,
        issues: validation.issues,
        wasRepaired: validation.wasRepaired
      });
    }
  }

  if (results.length > 0) {
    console.log('Contractor validation results:', results);
  } else {
    console.log('All contractors validated successfully - no issues found');
  }

  return results;
};