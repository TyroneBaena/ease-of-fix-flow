import { useState, useEffect, useCallback } from 'react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { tenantService } from '@/services/user/tenantService';
import { toast } from "sonner";

export interface UseTenantSchemaResult {
  isSchemaReady: boolean;
  organizationName: string | null;
  organizationId: string | null;
  setSchemaForOperation: (operation: string) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for organization-based tenant management
 * Replaces the old schema-based approach
 */
export const useTenantSchema = (): UseTenantSchemaResult => {
  const { currentUser } = useUserContext();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isSchemaReady, setIsSchemaReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Function to fetch organization information
  const fetchOrganizationInfo = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const userProfile = await tenantService.getUserOrganization();
      
      if (userProfile?.organization_id) {
        console.log("Found organization for user:", userProfile.organizations?.name);
        setOrganizationId(userProfile.organization_id);
        setOrganizationName(userProfile.organizations?.name || 'Unknown Organization');
        setIsSchemaReady(true);
      } else {
        setError(new Error('No organization found for current user'));
        setIsSchemaReady(false);
      }
    } catch (err: any) {
      console.error("Error fetching organization info:", err);
      setError(err);
      setIsSchemaReady(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);
  
  // Function to set schema for an operation (now a no-op for organization-based approach)
  const setSchemaForOperation = async (operation: string): Promise<boolean> => {
    if (!currentUser || !isSchemaReady) {
      console.warn("Cannot set schema - user not authenticated or organization not ready");
      return false;
    }
    
    try {
      // Organization-based approach doesn't need explicit schema switching
      // All operations are automatically scoped by organization_id via RLS
      console.log(`Operation ${operation} ready for organization ${organizationId}`);
      return true;
    } catch (err: any) {
      console.error("Error setting context for operation:", err);
      toast.error(`Context error: ${err.message}`);
      return false;
    }
  };
  
  // Fetch organization info when component mounts or user changes
  useEffect(() => {
    fetchOrganizationInfo().catch(err => {
      console.error("Error in useEffect organization initialization:", err);
    });
  }, [fetchOrganizationInfo, currentUser]);
  
  return {
    isSchemaReady,
    organizationName,
    organizationId,
    setSchemaForOperation,
    loading,
    error
  };
};

export default useTenantSchema;