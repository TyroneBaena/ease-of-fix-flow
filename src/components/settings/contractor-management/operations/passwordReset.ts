
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
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
  
  if (error) throw error;
  toast.success(`Password reset email sent to ${email}`);
};
