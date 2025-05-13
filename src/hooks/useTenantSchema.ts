
import { useState, useEffect, useCallback } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { tenantService } from '@/services/user/tenantService';
import { toast } from "sonner";

export interface UseTenantSchemaResult {
  isSchemaReady: boolean;
  schemaName: string | null;
  setSchemaForOperation: (operation: string) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
}

export const useTenantSchema = (): UseTenantSchemaResult => {
  const { currentUser } = useUserContext();
  const [schemaName, setSchemaName] = useState<string | null>(null);
  const [isSchemaReady, setIsSchemaReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Function to fetch schema information
  const fetchSchemaInfo = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const schemaInfo = await tenantService.getUserSchema();
      
      if (schemaInfo) {
        console.log("Found schema for user:", schemaInfo.schema_name);
        setSchemaName(schemaInfo.schema_name);
        setIsSchemaReady(true);
      } else {
        setError(new Error('No schema found for current user'));
        setIsSchemaReady(false);
      }
    } catch (err: any) {
      console.error("Error fetching schema info:", err);
      setError(err);
      setIsSchemaReady(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Function to set schema for an operation
  const setSchemaForOperation = async (operation: string): Promise<boolean> => {
    if (!currentUser || !isSchemaReady) {
      console.warn("Cannot set schema - user not authenticated or schema not ready");
      return false;
    }
    
    try {
      const success = await tenantService.useUserSchema(operation);
      if (!success) {
        toast.error("Failed to set schema context for operation");
      }
      return success;
    } catch (err: any) {
      console.error("Error setting schema for operation:", err);
      toast.error(`Schema error: ${err.message}`);
      return false;
    }
  };
  
  // Fetch schema info when component mounts or user changes
  useEffect(() => {
    fetchSchemaInfo().catch(err => {
      console.error("Error in useEffect schema initialization:", err);
    });
  }, [fetchSchemaInfo, currentUser]);
  
  return {
    isSchemaReady,
    schemaName,
    setSchemaForOperation,
    loading,
    error
  };
};

export default useTenantSchema;
