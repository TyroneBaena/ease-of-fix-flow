
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export const resetContractorPassword = async (contractorId: string, email: string) => {
  const { data: contractorData, error: contractorError } = await supabase
    .from('contractors')
    .select('user_id')
    .eq('id', contractorId)
    .single();
    
  if (contractorError) throw contractorError;
  
  if (!contractorData?.user_id) {
    throw new Error('Could not find user account for this contractor');
  }
  
  // Use production URL if on production, otherwise use current origin
  const isProduction = window.location.hostname === 'housinghub.app' || window.location.hostname === 'www.housinghub.app';
  const redirectUrl = isProduction 
    ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
    : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  
  if (error) throw error;
  toast.success(`Password reset email sent to ${email}`);
};
