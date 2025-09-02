import { supabase } from '@/integrations/supabase/client';

/**
 * Organization-based tenant service
 * Replaces the old tenant schema approach with organization-based multi-tenancy
 */

/**
 * Gets the current user's organization information
 */
export const getUserOrganization = async () => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session?.user) {
      console.log('No active session found');
      return null;
    }
    
    // Get user's profile with organization info
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organizations (
          id,
          name,
          slug,
          settings,
          created_at
        )
      `)
      .eq('id', session.session.user.id)
      .single();
      
    if (error) {
      console.error('Error fetching user organization:', error);
      return null;
    }
    
    return profile;
  } catch (error) {
    console.error('Error in getUserOrganization:', error);
    return null;
  }
};

/**
 * Verifies that the user belongs to an organization
 */
export const verifyUserOrganization = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error verifying user organization:', error);
      return false;
    }
    
    return data?.organization_id != null;
  } catch (error) {
    console.error('Error in verifyUserOrganization:', error);
    return false;
  }
};

/**
 * Ensures user has proper organization setup
 */
export const ensureUserOrganization = async (userId: string): Promise<boolean> => {
  try {
    // Check if user already has organization
    const hasOrg = await verifyUserOrganization(userId);
    if (hasOrg) {
      return true;
    }

    // If no organization, the trigger should have created one
    // Let's check again after a brief delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const recheckHasOrg = await verifyUserOrganization(userId);
    if (recheckHasOrg) {
      return true;
    }

    console.error('User organization setup failed - organization not found after trigger execution');
    return false;
  } catch (error) {
    console.error('Error ensuring user organization:', error);
    return false;
  }
};

/**
 * Gets organization activity logs for audit purposes
 */
export const getOrganizationAuditLogs = async (limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getOrganizationAuditLogs:', error);
    return [];
  }
};

// Legacy exports for backward compatibility (will be removed)
export const getUserSchema = getUserOrganization;
export const verifyUserSchema = verifyUserOrganization;
export const useUserSchema = async () => true; // No-op for compatibility

export const tenantService = {
  getUserOrganization,
  verifyUserOrganization,
  ensureUserOrganization,
  getOrganizationAuditLogs,
  // Legacy methods
  getUserSchema,
  verifyUserSchema,
  useUserSchema
};