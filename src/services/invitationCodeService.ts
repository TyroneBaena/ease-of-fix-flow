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
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        return { valid: false, data: null, error };
      }

      if (!data) {
        return { valid: false, data: null, error: new Error('Invalid code') };
      }

      if (data.current_uses >= data.max_uses) {
        return { valid: false, data: null, error: new Error('Code has reached maximum uses') };
      }

      return { valid: true, data: data as InvitationCode, error: null };
    } catch (error) {
      console.error('Error validating invitation code:', error);
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

      // Validate the code first
      console.log('📝 InvitationCodeService - Validating code...');
      const validation = await this.validateCode(code);
      if (!validation.valid || !validation.data) {
        console.error('📝 InvitationCodeService - Code validation failed:', validation.error);
        return { success: false, organization_id: null, assigned_role: null, error: validation.error };
      }

      console.log('📝 InvitationCodeService - Code validated successfully');
      const invitationCode = validation.data;

      // Check if this user has already used this invitation code
      console.log('📝 InvitationCodeService - Checking for existing usage...');
      const { data: existingUsage, error: usageCheckError } = await supabase
        .from('invitation_code_usage')
        .select('id, used_at')
        .eq('invitation_code_id', invitationCode.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageCheckError && usageCheckError.code !== 'PGRST116') {
        console.error('📝 InvitationCodeService - Error checking usage:', usageCheckError);
        throw usageCheckError;
      }

      if (existingUsage) {
        console.warn('📝 InvitationCodeService - Code already used by this user');
        return { 
          success: false, 
          organization_id: null, 
          assigned_role: null, 
          error: new Error('You have already used this invitation code. Each code can only be used once per user.') 
        };
      }

      console.log('📝 InvitationCodeService - Recording usage...');
      // Record usage
      const { error: usageError } = await supabase
        .from('invitation_code_usage')
        .insert({
          invitation_code_id: invitationCode.id,
          user_id: user.id,
        });

      if (usageError) {
        console.error('📝 InvitationCodeService - Error recording usage:', usageError);
        throw usageError;
      }

      console.log('📝 InvitationCodeService - Incrementing usage count...');
      // Increment usage count
      const { error: updateError } = await supabase
        .from('invitation_codes')
        .update({ current_uses: invitationCode.current_uses + 1 })
        .eq('id', invitationCode.id);

      if (updateError) {
        console.error('📝 InvitationCodeService - Error updating count:', updateError);
        throw updateError;
      }

      console.log('📝 InvitationCodeService - Updating user profile...');
      // Update user's profile with organization and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: invitationCode.organization_id,
          session_organization_id: invitationCode.organization_id,
          role: invitationCode.assigned_role,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('📝 InvitationCodeService - Error updating profile:', profileError);
        throw profileError;
      }

      console.log('📝 InvitationCodeService - Creating user organization membership...');
      // Create or update user organization membership
      const { error: membershipError } = await supabase
        .from('user_organizations')
        .upsert({
          user_id: user.id,
          organization_id: invitationCode.organization_id,
          role: invitationCode.assigned_role,
          is_active: true,
          is_default: true,
        }, {
          onConflict: 'user_id,organization_id'
        });

      if (membershipError) {
        console.error('📝 InvitationCodeService - Membership error:', membershipError);
        throw membershipError;
      }

      console.log('📝 InvitationCodeService - SUCCESS! User joined organization');
      return {
        success: true,
        organization_id: invitationCode.organization_id,
        assigned_role: invitationCode.assigned_role,
        error: null,
      };
    } catch (error) {
      console.error('📝 InvitationCodeService - CRITICAL ERROR:', error);
      return { success: false, organization_id: null, assigned_role: null, error: error as Error };
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
      const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting invitation code:', error);
      return { success: false, error: error as Error };
    }
  },
};
