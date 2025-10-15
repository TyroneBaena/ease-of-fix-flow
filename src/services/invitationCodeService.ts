import { supabase } from '@/lib/supabase';

export interface InvitationCode {
  id: string;
  code: string;
  organization_id: string;
  created_by: string;
  assigned_role: 'admin' | 'manager' | 'contractor';
  expires_at: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  internal_note?: string;
  created_at: string;
  updated_at: string;
}

export interface InvitationCodeUsage {
  id: string;
  invitation_code_id: string;
  user_id: string;
  used_at: string;
}

export interface GenerateCodeParams {
  assigned_role: 'admin' | 'manager' | 'contractor';
  expires_in_days: number;
  max_uses: number;
  internal_note?: string;
}

// Generate a random invitation code
const generateRandomCode = (): string => {
  const prefix = 'JOIN';
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${random}`;
};

export const invitationCodeService = {
  // Generate a new invitation code
  async generateCode(params: GenerateCodeParams): Promise<{ code: InvitationCode | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { code: null, error: new Error('User not authenticated') };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        return { code: null, error: new Error('User does not belong to an organization') };
      }

      const codeString = generateRandomCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + params.expires_in_days);

      const { data, error } = await supabase
        .from('invitation_codes')
        .insert({
          code: codeString,
          organization_id: profile.organization_id,
          created_by: user.id,
          assigned_role: params.assigned_role,
          expires_at: expiresAt.toISOString(),
          max_uses: params.max_uses,
          internal_note: params.internal_note,
        })
        .select()
        .single();

      if (error) throw error;
      return { code: data as InvitationCode, error: null };
    } catch (error) {
      console.error('Error generating invitation code:', error);
      return { code: null, error: error as Error };
    }
  },

  // Validate an invitation code
  async validateCode(code: string): Promise<{ valid: boolean; data: InvitationCode | null; error: Error | null }> {
    try {
      console.log('📝 InvitationCodeService - Validating code:', code);
      
      const validatePromise = supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Code validation timed out')), 10000);
      });

      const { data, error } = await Promise.race([validatePromise, timeoutPromise]).catch((err) => {
        console.error('📝 InvitationCodeService - Validation failed:', err);
        return { data: null, error: err };
      }) as any;

      if (error) {
        console.error('📝 InvitationCodeService - Validation error:', error);
        return { valid: false, data: null, error };
      }

      if (!data) {
        console.warn('📝 InvitationCodeService - Invalid code (not found)');
        return { valid: false, data: null, error: new Error('Invalid code') };
      }

      if (data.current_uses >= data.max_uses) {
        console.warn('📝 InvitationCodeService - Code has reached maximum uses');
        return { valid: false, data: null, error: new Error('Code has reached maximum uses') };
      }

      console.log('📝 InvitationCodeService - Code is valid');
      return { valid: true, data: data as InvitationCode, error: null };
    } catch (error) {
      console.error('📝 InvitationCodeService - Error validating invitation code:', error);
      return { valid: false, data: null, error: error as Error };
    }
  },

  // Use an invitation code (join organization)
  async useCode(code: string): Promise<{ success: boolean; organization_id: string | null; assigned_role: string | null; error: Error | null }> {
    try {
      console.log('📝 InvitationCodeService.useCode - START:', code);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('📝 InvitationCodeService - No authenticated user');
        return { success: false, organization_id: null, assigned_role: null, error: new Error('User not authenticated') };
      }

      console.log('📝 InvitationCodeService - User authenticated:', user.email);
      console.log('📝 InvitationCodeService - Calling secure edge function...');

      // Call the secure edge function with service role permissions
      const { data, error } = await supabase.functions.invoke('use-invitation-code', {
        body: {
          code: code.trim().toUpperCase(),
          user_id: user.id
        }
      });

      console.log('📝 InvitationCodeService - Edge function response:', { data, error });

      if (error) {
        console.error('📝 InvitationCodeService - Edge function error:', error);
        return { 
          success: false, 
          organization_id: null, 
          assigned_role: null, 
          error: new Error(error.message || 'Failed to join organization') 
        };
      }

      if (!data.success) {
        console.error('📝 InvitationCodeService - Join failed:', data.error);
        return { 
          success: false, 
          organization_id: null, 
          assigned_role: null, 
          error: new Error(data.error || 'Failed to join organization') 
        };
      }

      console.log('📝 InvitationCodeService - SUCCESS! User joined organization:', {
        organization_id: data.organization_id,
        assigned_role: data.assigned_role
      });

      return {
        success: true,
        organization_id: data.organization_id,
        assigned_role: data.assigned_role,
        error: null,
      };
    } catch (error) {
      console.error('📝 InvitationCodeService - CRITICAL ERROR:', error);
      return { 
        success: false, 
        organization_id: null, 
        assigned_role: null, 
        error: error as Error 
      };
    }
  },

  // Get all invitation codes for the current organization
  async getOrganizationCodes(): Promise<{ codes: InvitationCode[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { codes: (data || []) as InvitationCode[], error: null };
    } catch (error) {
      console.error('Error fetching invitation codes:', error);
      return { codes: [], error: error as Error };
    }
  },

  // Get usage history for a specific code
  async getCodeUsage(codeId: string): Promise<{ usage: any[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('invitation_code_usage')
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq('invitation_code_id', codeId)
        .order('used_at', { ascending: false });

      if (error) throw error;
      return { usage: data || [], error: null };
    } catch (error) {
      console.error('Error fetching code usage:', error);
      return { usage: [], error: error as Error };
    }
  },

  // Revoke (deactivate) an invitation code
  async revokeCode(codeId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('invitation_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error revoking invitation code:', error);
      return { success: false, error: error as Error };
    }
  },

  // Delete an invitation code
  async deleteCode(codeId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      console.log('🗑️ Attempting to delete invitation code:', codeId);
      
      // First, let's verify the current user has admin role and organization access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('🗑️ No authenticated user');
        return { success: false, error: new Error('User not authenticated') };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      console.log('🗑️ User profile:', profile);

      // Get the invitation code to verify organization match
      const { data: codeData } = await supabase
        .from('invitation_codes')
        .select('organization_id, code')
        .eq('id', codeId)
        .single();

      console.log('🗑️ Invitation code data:', codeData);

      const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        console.error('🗑️ Delete error:', error);
        throw error;
      }
      
      console.log('🗑️ Successfully deleted invitation code');
      return { success: true, error: null };
    } catch (error) {
      console.error('🗑️ Error deleting invitation code:', error);
      return { success: false, error: error as Error };
    }
  },
};
