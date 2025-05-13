
import { supabase } from '@/integrations/supabase/client';

export interface SchemaInfo {
  id: string;
  user_id: string;
  schema_name: string;
  created_at: string;
}

/**
 * Gets the current user's schema information
 */
export const getUserSchema = async (): Promise<SchemaInfo | null> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session?.user) {
      console.log('No active session found');
      return null;
    }
    
    const { data, error } = await supabase
      .from('tenant_schemas')
      .select('*')
      .eq('user_id', session.session.user.id)
      .single();
      
    if (error) {
      console.error('Error fetching user schema:', error);
      return null;
    }
    
    return data as SchemaInfo;
  } catch (error) {
    console.error('Exception in getUserSchema:', error);
    return null;
  }
};

/**
 * Uses a specific schema for database operations
 */
export const useUserSchema = async (operation: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('use_tenant_schema', {
      operation
    });
    
    if (error) {
      console.error('Error using tenant schema:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in useUserSchema:', error);
    return false;
  }
};

/**
 * Checks if the schema was successfully created for a user
 */
export const verifyUserSchema = async (userId: string): Promise<boolean> => {
  try {
    const { data, error, count } = await supabase
      .from('tenant_schemas')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error verifying user schema:', error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error('Exception in verifyUserSchema:', error);
    return false;
  }
};

export const tenantService = {
  getUserSchema,
  useUserSchema,
  verifyUserSchema
};

export default tenantService;
