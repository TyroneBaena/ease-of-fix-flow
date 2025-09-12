import { supabase } from '@/integrations/supabase/client';

/**
 * Validates that a user belongs to a specific organization
 */
export const validateUserOrganizationAccess = async (
  userId: string, 
  organizationId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_organizations')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error validating user organization access:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception validating user organization access:', error);
    return false;
  }
};

/**
 * Checks if a user has any organization membership
 */
export const checkUserHasOrganization = async (userId: string): Promise<boolean> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking user organization:', error);
      return false;
    }

    return !!profile?.organization_id;
  } catch (error) {
    console.error('Exception checking user organization:', error);
    return false;
  }
};

/**
 * Ensures organization isolation for data access
 */
export const validateOrganizationContext = async (
  userId: string
): Promise<{ isValid: boolean; organizationId: string | null }> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('organization_id, session_organization_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error validating organization context:', error);
      return { isValid: false, organizationId: null };
    }

    const organizationId = profile.session_organization_id || profile.organization_id;
    
    return {
      isValid: !!organizationId,
      organizationId
    };
  } catch (error) {
    console.error('Exception validating organization context:', error);
    return { isValid: false, organizationId: null };
  }
};